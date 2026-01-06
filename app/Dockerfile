# 使用官方 Python 镜像
FROM python:3.13
# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# 设置工作目录
WORKDIR /app

# 复制锁定文件和项目配置
COPY pyproject.toml uv.lock ./

# 使用锁定文件安装（确保完全一致的依赖版本）
RUN uv sync --frozen --index-url https://pypi.org/simple/

# 复制应用代码
COPY . .

# 关键修复：设置虚拟环境 PATH
ENV UV_PROJECT_ENVIRONMENT=/app/.venv
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 验证 gunicorn 安装
RUN which gunicorn

# 暴露端口
EXPOSE 3000

# 设置默认启动命令
CMD ["gunicorn", "main:fast_app", "-c", "docker_config.py"]