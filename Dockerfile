# 构建前端静态资源
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# 运行后端并托管前端静态资源
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app
ENV APP_ENV=production

# 复制依赖文件并安装
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY backend/app/ ./app/

# 复制前端构建产物，由 FastAPI 托管
COPY --from=frontend-build /frontend/dist ./static/

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["sh", "-c", "gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8080} --access-logfile -"]
