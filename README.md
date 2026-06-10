# 🐱 猫咪管理系统 API

纯后端 API 服务，基于 FastAPI + PostgreSQL。

## 功能

- **🐈 猫咪档案**：增删改查、体重记录
- **⏰ 任务提醒**：周期性任务、Bark 推送
- **📦 库存管理**：分类、消耗、预警
- **💰 花费统计**：分类/月度分析

## API 文档

启动后访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- 健康检查: `GET /api/health`

## 快速启动

### Docker（推荐）

```bash
cd backend
# 配置 .env
cp .env.example .env
# 启动
docker compose -f docker-compose.prod.yml up -d
```

### 本地开发

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `BARK_KEY` | Bark 推送密钥（可选） |
| `BARK_SERVER` | Bark 服务器地址 |
