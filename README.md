# 🐱 猫咪管理系统 API

纯后端 API 服务，基于 FastAPI + PostgreSQL。

## 功能

- **🐈 猫咪档案**：增删改查、体重记录
- **⏰ 任务提醒**：周期性任务、Bark 推送
- **📦 库存管理**：分类、消耗、预警
- **💰 花费统计**：分类/月度分析

## 配置

环境变量通过 `.env` 文件管理：

```bash
cp .env.example .env
# 编辑 .env 填写实际值
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:postgres@localhost:5432/cat_management` |
| `BARK_KEY` | Bark 推送密钥（可选） | 空 |
| `BARK_SERVER` | Bark 服务器地址 | `https://api.day.app` |

## 快速启动

### Docker Compose

```bash
# 1. 配置环境变量
cp .env.example .env

# 2. 启动服务
docker compose -f docker-compose.prod.yml up -d

# 3. 访问 API 文档
open http://localhost:8000/docs
```

### 本地开发

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Zeabur 部署（GitHub）

1. Fork 本仓库或推送到你的 GitHub
2. 在 [Zeabur](https://zeabur.com) 选择 **Deploy from GitHub**
3. 选择本仓库，Zeabur 会自动检测根目录 `Dockerfile` 并构建
4. 添加 **PostgreSQL** 服务并绑定到后端服务（自动注入 `DATABASE_URL`）
5. 如需 Bark 推送，在环境变量中添加 `BARK_KEY`
6. 访问 `https://你的域名.zeabur.app/docs` 查看 API 文档

## API 文档

启动后访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- 健康检查: `GET /api/health`

## 项目结构

```
cat-management/
├── Dockerfile                 # Zeabur / Docker 构建入口
├── docker-compose.prod.yml    # 生产环境编排
├── .env.example               # 环境变量模板
├── README.md
└── backend/
    ├── requirements.txt
    └── app/
        ├── main.py            # FastAPI 入口
        ├── config.py          # 集中配置管理
        ├── database.py        # 数据库连接
        ├── models.py          # SQLAlchemy 模型
        ├── schemas.py         # Pydantic 校验
        ├── crud.py            # 数据库操作
        ├── routers/           # API 路由
        │   ├── cats.py
        │   ├── tasks.py
        │   ├── inventory.py
        │   └── expenses.py
        └── services/
            ├── bark.py        # Bark 推送
            └── scheduler.py   # 定时任务
```
