# import os
# import re
# import skia

# # os.environ['FONT_DIR'] = 'D:\py\breatic\app\fonts\\'
# font_dir = os.environ.get("FONT_DIR", "")

# # --- 工具：解析类似 "Consolas-Bold", "Arial-Italic", "PingFangSC-Semibold" 的风格 ---
# def parse_family_style(font_family: str):
#     # 返回 (family, weight, slant)
#     # weight: 100..900；slant: skia.FontStyle.kUpright_Slant / kItalic_Slant / kOblique_Slant
#     parts = font_family.split('-')
#     family = parts[0]
#     suffix = '-'.join(parts[1:]) if len(parts) > 1 else ''
#     weight = 400
#     slant = skia.FontStyle.kUpright_Slant

#     # 常见后缀粗细映射
#     table = [
#         ('Black', 900),
#         ('ExtraBold', 800), ('XBold', 800),
#         ('Bold', 700),
#         ('SemiBold', 600), ('DemiBold', 600),
#         ('Medium', 500),
#         ('Regular', 400), ('Book', 400), ('Normal', 400),
#         ('Light', 300), ('ExtraLight', 200), ('Thin', 100),
#     ]
#     for key, w in table:
#         if re.search(rf'(^|-)({key})(-|$)', suffix, re.IGNORECASE):
#             weight = w
#             break

#     if re.search(r'(^|-)(Italic|Oblique)(-|$)', suffix, re.IGNORECASE):
#         slant = skia.FontStyle.kItalic_Slant  # Oblique 也用 italic 处理

#     return family, weight, slant


# def parse_family_style(s: str):
#     # 简单解析示例：支持 "Consolas", "Consolas-Bold", "Consolas-BoldItalic" 等
#     family = s
#     weight = skia.FontStyle.kNormal_Weight
#     slant  = skia.FontStyle.kUpright_Slant

#     # 拆掉 -Bold/-Italic 后缀
#     m = re.match(r'^(.*?)(?:-(.*))?$', s)
#     if m:
#         family = m.group(1)
#         suffix = (m.group(2) or "").lower()
#         if "bold" in suffix:
#             weight = skia.FontStyle.kBold_Weight
#         if "italic" in suffix or "oblique" in suffix:
#             slant = skia.FontStyle.kItalic_Slant
#     return family, weight, slant

# def get_typeface(path: str) -> skia.Typeface:
#     # ---- 1) 路径加载：支持 .ttf/.otf/.ttc/.otc，并可用 "#idx" 指定集合索引 ----
#     if os.path.isfile(path) and path.lower().endswith(('.ttf', '.otf', '.ttc', '.otc')):
#         index = 0
#         # 允许 "font.ttc#1" 这种写法
#         if path.lower().endswith(('.ttc', '.otc')) and '#' in path:
#             p, idx = path.split('#', 1)
#             if os.path.isfile(p):
#                 path, index = p, int(idx or 0)
#         tf = skia.Typeface.MakeFromFile(path, index)
#         if tf:
#             return tf

#     # ---- 2) 家族名 + 样式匹配 ----
#     family, weight, slant = parse_family_style(font_family)
#     fm = skia.FontMgr.RefDefault()
#     style = skia.FontStyle(weight, skia.FontStyle.kNormal_Width, slant)
#     tf = fm.matchFamilyStyle(family, style)
#     if tf:
#         return tf

#     # ---- 3) 兜底 ----
#     return skia.Typeface.MakeDefault()

# # --- 加载字体 ---
# def load_font(font_size: int = 48, font_family: str = 'Arial'):
#     # 1) “确保字体可用”：尝试加载/匹配
#     typeface = get_typeface(font_dir+font_family)
    
#      # 2) 构建 Font（等价于 ctx.font = "48px Arial"）
#     return skia.Font(typeface, font_size)