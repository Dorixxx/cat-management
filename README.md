# 🐱 猫咪管理系统

一个完整的猫咪管理全栈应用，包含猫咪档案、任务提醒、库存管理和花费统计功能。

## 功能特性

- **🐈 猫咪档案**：记录猫咪基础信息（名字、性别、品种、体重、生日等），支持体重变化追踪
- **⏰ 任务提醒**：自定义定时任务（剪指甲、驱虫、洗澡等），支持周期性任务，通过 Bark 推送到手机
- **📦 库存管理**：管理猫砂、猫粮、水等消耗品，自定义分类和每周损耗，库存不足时自动预警
- **💰 花费统计**：记录宠物相关花费，按分类和月度统计分析

## 技术栈

- **后端**：Python + FastAPI + SQLAlchemy + PostgreSQL
- **前端**：原生 HTML/CSS/JavaScript 单页应用
- **推送**：Bark (iOS) 推送服务
- **定时任务**：APScheduler

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
DATABASE_URL=postgresql://用户名:密码@localhost:5432/cat_management
BARK_KEY=你的Bark密钥
BARK_SERVER=https://api.day.app
```

### 3. 创建数据库

```bash
psql -U postgres -c "CREATE DATABASE cat_management;"
```

### 4. 启动服务

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 访问应用

打开浏览器访问 http://localhost:8000

## Bark 推送配置

1. iOS 设备下载 Bark App
2. 复制你的 Bark Key
3. 填入 `.env` 文件的 `BARK_KEY`

## API 文档

启动后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 项目结构

```
cat-management/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── database.py          # 数据库连接
│   │   ├── models.py            # SQLAlchemy 模型
│   │   ├── schemas.py           # Pydantic 数据模型
│   │   ├── crud.py              # 数据库操作
│   │   ├── routers/             # API 路由
│   │   │   ├── cats.py          # 猫咪管理
│   │   │   ├── tasks.py         # 任务提醒
│   │   │   ├── inventory.py     # 库存管理
│   │   │   └── expenses.py      # 花费统计
│   │   ├── services/            # 业务服务
│   │   │   ├── bark.py          # Bark 推送
│   │   │   └── scheduler.py     # 定时任务
│   │   └── static/              # 前端文件
│   │       ├── index.html
│   │       ├── css/style.css
│   │       └── js/app.js
│   ├── requirements.txt
│   └── .env
└── README.md
```

## 定时任务说明

- **任务检查**：每 5 分钟检查一次即将到期的任务，提前推送提醒
- **库存检查**：每天上午 9 点检查库存预警，推送补货提醒

## 数据库模型

| 表名 | 说明 |
|------|------|
| cats | 猫咪基础信息 |
| weight_records | 体重记录 |
| tasks | 任务提醒 |
| inventory_categories | 库存分类 |
| inventory | 库存物品 |
| consumption_records | 消耗记录 |
| expenses | 花费记录 |
