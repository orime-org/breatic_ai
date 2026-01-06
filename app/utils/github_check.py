#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Secret guard (no ripgrep required)

- 仅扫描 pre-commit 传入的变更文件；无参数时兜底扫描“已暂存文件（--cached）”
- 规则：
  1) os.environ.get / os.getenv 的「非空默认值」
  2) 常见“像密钥”的字面量赋值（收敛字符集与长度以降低误报）
  3) 私钥块（BEGIN ... PRIVATE KEY）
  4) JS/TS 中 process.env 的字符串 fallback（?? / ||）
- 忽略：
  - 行内加注释：# secret-guard: ignore-line  → 忽略该行
  - 常见目录/二进制扩展名；超大文件（默认 5MB，可设 SECRET_GUARD_MAX_BYTES）
- 输出：文件路径:行:列 规则名 片段
- 退出码：有命中 → 1；无命中 → 0
"""

from __future__ import annotations
import io
import os
import re
import sys
import locale
import pathlib
import subprocess
from typing import Iterable, List, Tuple

# ========================= Console-safe printing =========================

def _supports_utf8() -> bool:
    enc = (getattr(sys.stdout, "encoding", None) or "").lower()
    if "utf" in enc:
        return True
    loc = (locale.getpreferredencoding(False) or "").lower()
    return "utf" in loc

def _prepare_stdout():
    # 尝试强制 UTF-8；失败则保持原样并走 safe_print 的降级
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # py3.7+
    except Exception:
        pass

USE_UTF8 = _supports_utf8()
_prepare_stdout()
OK = "✅" if USE_UTF8 else "[OK]"
NG = "❌" if USE_UTF8 else "[ALERT]"
SEP = "—"  if USE_UTF8 else "-"

def safe_print(s: str = "", end: str = "\n"):
    try:
        print(s, end=end)
    except UnicodeEncodeError:
        print(s.encode("ascii", "ignore").decode("ascii"), end=end)

# ============================== Settings ================================

DEFAULT_MAX_BYTES = 5 * 1024 * 1024
try:
    MAX_BYTES = int(os.environ.get("SECRET_GUARD_MAX_BYTES", DEFAULT_MAX_BYTES))
except ValueError:
    MAX_BYTES = DEFAULT_MAX_BYTES

IGNORED_DIRS = {".git", "venv", ".venv", "node_modules", "migrations", "__pycache__", "dist", "build"}
BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
    ".mp4", ".mov", ".avi", ".mkv", ".heic", ".heif",
    ".ogg", ".mp3", ".wav",
}

IGNORE_LINE_TOKEN = "secret-guard: ignore-line"

# =============================== Rules ==================================

# 1) Python: os.environ.get / os.getenv 非空默认值
PAT_ENV_DEFAULT = re.compile(
    r"""os\.(?:environ\.get|getenv)\s*\(
        \s*["'][A-Za-z0-9_]+["']\s*,\s*      # key,
        ["'][^"']+["']\s*                    # 非空字符串默认值
    \)""",
    re.VERBOSE,
)

# 2) 常见凭据字面量赋值（更像 token 的字符集，长度 >= 8）
PAT_ASSIGN_SECRET = re.compile(
    r"""(?ix)
    \b(
        api(_?key)?|
        access(_?key)?|
        secret|
        token|
        private_key|
        credential|
        auth|
        keyid|key_id
    )\b
    \s*=\s*
    ["'][A-Za-z0-9_\-+=/]{8,}["']
    """
)

# 3) 私钥块
PAT_PRIVATE_KEY = re.compile(r"-----BEGIN (RSA|EC|OPENSSH|PGP|DSA) PRIVATE KEY-----")

# 4) JS/TS: process.env 的字符串 fallback（?? / ||）
PAT_NODE_FALLBACK = re.compile(
    r"""process\.env\.[A-Z0-9_]+\s*(\?\?|\|\|)\s*["'][^"']+["']""",
    re.IGNORECASE,
)

RULES: List[Tuple[str, re.Pattern]] = [
    ("non-empty env default",    PAT_ENV_DEFAULT),
    ("hardcoded secret",         PAT_ASSIGN_SECRET),
    ("private key block",        PAT_PRIVATE_KEY),
    ("node env string fallback", PAT_NODE_FALLBACK),
]

# ============================== Helpers =================================

def is_ignored_path(p: pathlib.Path) -> bool:
    if any(part in IGNORED_DIRS for part in p.parts):
        return True
    if p.suffix.lower() in BINARY_EXTS:
        return True
    return False

def iter_args_files(argv: List[str]) -> Iterable[pathlib.Path]:
    """有参数：只用参数中存在且为文件的路径；不做全仓兜底。"""
    for a in argv:
        p = pathlib.Path(a)
        if p.is_file() and not is_ignored_path(p):
            yield p

def iter_staged_files() -> Iterable[pathlib.Path]:
    """无参数兜底：仅扫描已暂存文件（--cached）。"""
    try:
        r = subprocess.run(
            ["git", "diff", "--name-only", "--cached"],
            capture_output=True, text=True, check=True
        )
        for line in r.stdout.splitlines():
            p = pathlib.Path(line.strip())
            if p.is_file() and not is_ignored_path(p):
                yield p
    except Exception:
        # git 不可用时，保守：不扫描
        return

def iter_candidate_paths(argv: List[str]) -> Iterable[pathlib.Path]:
    if argv:
        yield from iter_args_files(argv)
    else:
        yield from iter_staged_files()

def preprocess_text_for_ignores(text: str) -> str:
    """移除带有忽略标记的行，以避免误报。"""
    lines = text.splitlines()
    kept = []
    for ln in lines:
        if IGNORE_LINE_TOKEN in ln:
            continue
        kept.append(ln)
    return "\n".join(kept)

def read_text_file(p: pathlib.Path) -> str:
    try:
        st = p.stat()
        if st.st_size > MAX_BYTES:
            return ""  # 跳过超大文件
        with io.open(p, "r", encoding="utf-8", errors="ignore") as f:
            data = f.read()
            # 快速二进制判断：含 NUL
            if "\x00" in data:
                return ""
            return data
    except Exception:
        return ""

def scan_text(text: str, *, filename: str) -> List[Tuple[int,int,str,str]]:
    """
    返回命中列表: (line, col, rule_name, snippet)
    """
    hits: List[Tuple[int,int,str,str]] = []
    if not text:
        return hits

    # 行忽略预处理
    text2 = preprocess_text_for_ignores(text)

    for rule_name, pat in RULES:
        for m in pat.finditer(text2):
            start = m.start()
            # 计算行/列（基于预处理后的文本）
            line = text2.count("\n", 0, start) + 1
            col  = start - (text2.rfind("\n", 0, start) + 1)
            snippet = m.group(0)
            if len(snippet) > 160:
                snippet = snippet[:160] + "..."
            hits.append((line, col+1, rule_name, snippet))
    return hits

# ================================ Main ==================================

def main():
    paths = list(iter_candidate_paths(sys.argv[1:]))

    any_problem = False
    all_findings: List[Tuple[str,int,int,str,str]] = []  # (file, line, col, rule, snippet)

    for f in paths:
        if is_ignored_path(f):
            continue
        text = read_text_file(f)
        if not text:
            continue
        findings = scan_text(text, filename=str(f))
        if findings:
            any_problem = True
            for (ln, col, rule, snip) in findings:
                all_findings.append((str(f), ln, col, rule, snip))

    if any_problem:
        safe_print(f"{NG} Potential secrets found:\n")
        # 排序：先按文件，再行号
        all_findings.sort(key=lambda x: (x[0].lower(), x[1], x[2]))
        current = None
        for file, ln, col, rule, snip in all_findings:
            if file != current:
                safe_print(f"{SEP*3} {file}")
                current = file
            safe_print(f"  {file}:{ln}:{col}  {rule}")
            safe_print(f"    -> {snip}")
        safe_print("\nFix or sanitize before committing. "
                   "If this is a false positive, adjust your code or add '# secret-guard: ignore-line' to skip a line.")
        sys.exit(1)
    else:
        safe_print(f"{OK} No obvious secrets detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()