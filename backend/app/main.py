import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from .database import engine, Base, ensure_schema_updates
from .routers import cats, tasks, inventory, expenses, bark_config
from .services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建数据库表
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates()
    # 启动定时任务
    start_scheduler()
    yield
    # 关闭时清理
    shutdown_scheduler()


app = FastAPI(
    title="🐱 猫咪管理系统 API",
    description="猫咪管理后端 API - 包含猫咪档案、任务提醒、库存管理、花费统计、Bark 推送配置",
    version="1.1.0",
    lifespan=lifespan
)

# CORS - 允许所有来源访问 API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(cats.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(bark_config.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "猫咪管理系统 API 运行中 🐱"}


default_static_dir = Path(__file__).resolve().parent.parent / "static"
frontend_dist = Path(os.getenv("FRONTEND_DIST", str(default_static_dir)))

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        requested_file = frontend_dist / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(frontend_dist / "index.html")
