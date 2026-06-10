# 猫咪管理系统

一个小型全栈猫咪管理应用，单仓库管理前端和后端。

- 后端：FastAPI + SQLAlchemy + PostgreSQL
- 前端：React + Vite + Tailwind CSS
- 通知：Bark 推送配置存储在后端数据库中，前端设置页负责配置

## 功能

- 猫咪档案：增删改查、体重记录
- 定期计划：护理任务、到期提醒、完成后自动顺延
- 日用备件：库存分类、库存调整、低库存预警
- 花费统计：后端已提供花费记录和统计接口
- Bark 推送：保存配置、测试推送、服务端定时提醒

## 项目结构

```text
cat-management/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI 入口
│       ├── config.py            # 后端配置
│       ├── database.py          # 数据库连接和兼容更新
│       ├── models.py            # SQLAlchemy 模型
│       ├── schemas.py           # Pydantic 请求/响应模型
│       ├── crud.py              # 数据库操作
│       ├── routers/             # API 路由
│       └── services/            # Bark 和定时任务
├── frontend/
│   ├── server.ts                # 本地开发代理，可选
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       └── utils/
├── Dockerfile                   # 单服务构建：前端静态资源 + 后端 API
├── docker-compose.prod.yml
├── .env.example                 # 后端环境变量
└── README.md
```

## 本地开发

### 1. 启动后端

```bash
cp .env.example .env
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

默认后端地址是 `http://127.0.0.1:8000`。

### 2. 启动前端

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

默认前端地址是 `http://127.0.0.1:3000`，本地开发时 `/api/*` 会代理到 `BACKEND_BASE_URL`。

## 环境变量

后端根目录 `.env`：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:postgres@localhost:5432/cat_management` |

前端 `frontend/.env` 只用于本地开发代理：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 前端 Express/Vite 服务端口 | `3000` |
| `BACKEND_BASE_URL` | 前端代理转发目标 | `http://127.0.0.1:8000` |

## Zeabur 部署

推荐单服务部署：

```text
Zeabur Project
├── PostgreSQL
└── cat-management app
```

应用服务使用仓库根目录的 `Dockerfile`。构建时会先执行 `frontend` 的 Vite build，再把 `frontend/dist` 放进后端镜像，由 FastAPI 同时托管前端页面和 `/api/*` 接口。

Zeabur 上只需要给应用服务配置数据库环境变量：

```bash
DATABASE_URL=你的 PostgreSQL 连接串
```

容器默认监听 `8080`，也会尊重 Zeabur 注入的 `PORT` 环境变量。

如果 Zeabur 注入的是 `POSTGRES_*` 或 `PG*` 变量，后端也会尝试自动组装连接串。部署后访问：

- `/`：前端页面
- `/api/health`：后端健康检查
- `/docs`：Swagger API 文档

## API

启动后端后访问：

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- 健康检查: `GET /api/health`

主要接口：

- `GET/POST /api/cats/`
- `GET/PUT/DELETE /api/cats/{cat_id}`
- `GET/POST /api/cats/{cat_id}/weights`
- `GET/POST /api/tasks/`
- `POST /api/tasks/{task_id}/complete`
- `GET/POST /api/inventory/categories`
- `GET/POST /api/inventory/items`
- `GET /api/inventory/warnings`
- `GET/POST /api/expenses/`
- `GET /api/expenses/stats/summary`
- `GET/POST/PUT /api/bark-config/`
- `POST /api/bark-config/test`

## Docker Compose

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d
```

Compose 会启动 PostgreSQL 和单服务应用，前端页面和后端 API 都由后端容器提供。
本地 Compose 会把宿主机 `8000` 映射到容器 `8080`。
