from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from .database import engine, Base
from .routers import cats, tasks, inventory, expenses
from .services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建数据库表
    Base.metadata.create_all(bind=engine)
    # 启动定时任务
    start_scheduler()
    yield
    # 关闭时清理
    shutdown_scheduler()


app = FastAPI(
    title="🐱 猫咪管理系统",
    description="管理你的猫咪信息、任务提醒、库存和花费统计",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由（加 /api 前缀）
app.include_router(cats.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")

# API 健康检查
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "猫咪管理系统运行中 🐱"}

# 静态文件（前端资源）
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/css", StaticFiles(directory=os.path.join(static_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(static_dir, "js")), name="js")

# SPA fallback - 所有非 API/静态资源请求返回 index.html
@app.get("/{path:path}")
async def serve_spa(path: str):
    if path.startswith("api/") or path.startswith("css/") or path.startswith("js/"):
        raise HTTPException(status_code=404)
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found")
