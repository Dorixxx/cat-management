# 🚀 猫咪管理系统 - 服务器部署指南

提供 **Docker 部署**（推荐）和 **传统部署** 两种方式。

---

## 方式一：Docker 部署（推荐 ⭐）

最简单、最稳定的方式，适合大多数云服务器。

### 前置要求

- 服务器：1核2G 内存即可（推荐 Ubuntu 22.04/24.04）
- 已安装 Docker 和 Docker Compose

### 1. 安装 Docker（如未安装）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker compose version
```

### 2. 上传项目代码

```bash
# 方式 A：通过 Git
git clone <你的仓库地址> /opt/cat-management
cd /opt/cat-management

# 方式 B：本地打包上传
tar czvf cat-management.tar.gz cat-management/
scp cat-management.tar.gz root@你的服务器IP:/opt/
ssh root@你的服务器IP "cd /opt && tar xzvf cat-management.tar.gz"
```

### 3. 配置环境变量

```bash
cd /opt/cat-management

# 创建环境变量文件
cat > .env << EOF
BARK_KEY=你的Bark推送密钥
BARK_SERVER=https://api.day.app
EOF
```

### 4. 一键启动

```bash
cd /opt/cat-management
docker compose -f docker-compose.prod.yml up -d

# 查看状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f backend
```

### 5. 访问应用

```
http://你的服务器IP
```

### 6. 常用运维命令

```bash
# 重启服务
docker compose -f docker-compose.prod.yml restart

# 更新代码后重新构建
docker compose -f docker-compose.prod.yml up -d --build

# 进入数据库
docker exec -it cat_postgres psql -U postgres -d cat_management

# 备份数据库
docker exec cat_postgres pg_dump -U postgres cat_management > backup.sql

# 恢复数据库
cat backup.sql | docker exec -i cat_postgres psql -U postgres -d cat_management

# 查看资源占用
docker stats
```

---

## 方式二：传统部署（Linux + Nginx + Systemd）

适合不想用 Docker、需要更精细控制的服务器环境。

### 前置要求

- Ubuntu 22.04/24.04 LTS 或 CentOS 8+
- 1核2G 内存

### 1. 运行自动部署脚本

```bash
# 上传代码到服务器
cd cat-management
chmod +x deploy/install.sh

# 在服务器上运行
sudo ./deploy/install.sh
```

### 2. 手动部署步骤（如脚本失败）

#### 步骤 1：安装依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib git

# CentOS/RHEL
sudo yum install -y python3 python3-pip nginx postgresql-server postgresql-contrib git
```

#### 步骤 2：配置 PostgreSQL

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql -c "CREATE USER catuser WITH PASSWORD '强密码';"
sudo -u postgres psql -c "CREATE DATABASE cat_management OWNER catuser;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cat_management TO catuser;"
```

#### 步骤 3：部署后端

```bash
# 创建目录
sudo mkdir -p /opt/cat-management
sudo chown $USER:$USER /opt/cat-management

# 上传代码（通过 git 或 scp）
git clone <仓库地址> /opt/cat-management
cd /opt/cat-management/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# 配置环境变量
cat > .env << EOF
DATABASE_URL=postgresql://catuser:强密码@localhost:5432/cat_management
BARK_KEY=你的Bark推送密钥
BARK_SERVER=https://api.day.app
EOF

# 初始化数据库表
python3 -c "
import sys
sys.path.insert(0, '.')
from app.database import engine, Base
Base.metadata.create_all(bind=engine)
print('数据库表创建成功')
"
```

#### 步骤 4：配置 Systemd 服务

```bash
sudo tee /etc/systemd/system/cat-management.service > /dev/null << 'EOF'
[Unit]
Description=Cat Management System
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/cat-management/backend
Environment="PATH=/opt/cat-management/backend/venv/bin"
Environment="DATABASE_URL=postgresql://catuser:强密码@localhost:5432/cat_management"
Environment="BARK_KEY=你的Bark推送密钥"
Environment="BARK_SERVER=https://api.day.app"
ExecStart=/opt/cat-management/backend/venv/bin/gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cat-management
sudo systemctl start cat-management
```

#### 步骤 5：配置 Nginx

```bash
sudo tee /etc/nginx/sites-available/cat-management > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # 或你的域名

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/cat-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 步骤 6：配置防火墙

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 配置 HTTPS（SSL 证书）

### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（替换为你的域名）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 手动配置 SSL

```bash
# 将证书文件放到服务器
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.pem /etc/nginx/ssl/cert.pem
sudo cp your-key.pem /etc/nginx/ssl/key.pem

# 修改 nginx 配置启用 HTTPS（参考 deploy/nginx-site.conf 中的注释部分）
sudo nano /etc/nginx/sites-available/cat-management
```

---

## 配置域名

1. 在域名服务商处添加 A 记录：
   - 主机记录：`@` 或 `cat`
   - 记录值：你的服务器公网 IP

2. 修改 Nginx 配置中的 `server_name`：
   ```nginx
   server_name cat.yourdomain.com;
   ```

---

## 日常运维

### 查看服务状态

```bash
# 后端服务
sudo systemctl status cat-management
sudo journalctl -u cat-management -f

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# PostgreSQL
sudo systemctl status postgresql
```

### 更新代码

```bash
cd /opt/cat-management
git pull origin main

# Docker 方式
docker compose -f docker-compose.prod.yml up -d --build

# 传统方式
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart cat-management
```

### 数据库备份（建议设置定时任务）

```bash
# 手动备份
sudo -u postgres pg_dump cat_management > /opt/backups/cat_management_$(date +%Y%m%d).sql

# 自动备份（添加到 crontab）
0 3 * * * sudo -u postgres pg_dump cat_management > /opt/backups/cat_management_$(date +\%Y\%m\%d).sql
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查看 8000 端口占用
sudo lsof -i :8000
# 或更换端口启动
# 修改 systemd 服务文件中的 --bind 参数
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查数据库是否存在
sudo -u postgres psql -l

# 检查用户权限
sudo -u postgres psql -c "\du"
```

### 3. 静态文件加载失败

```bash
# 检查 Nginx 配置中的路径
# 或确保后端 static 目录权限正确
sudo chown -R www-data:www-data /opt/cat-management/backend/app/static
```

### 4. Bark 推送不工作

- 检查 `.env` 中的 `BARK_KEY` 是否正确
- 确保服务器能访问 `api.day.app`
- 查看后端日志中的 `[Bark]` 输出

---

## 推荐云服务器

| 厂商 | 配置 | 价格（约） | 链接 |
|------|------|-----------|------|
| 阿里云 | 1核2G | 99元/年 | [轻量应用服务器](https://www.aliyun.com) |
| 腾讯云 | 1核2G | 99元/年 | [轻量应用服务器](https://cloud.tencent.com) |
| AWS | t3.micro | 免费 tier | [EC2](https://aws.amazon.com) |

---

## 部署检查清单

- [ ] 服务器系统更新到最新
- [ ] PostgreSQL 已安装并运行
- [ ] 数据库用户和密码已设置（非默认）
- [ ] 后端代码已上传到服务器
- [ ] 环境变量 `.env` 已配置（特别是 BARK_KEY）
- [ ] 数据库表已初始化
- [ ] 后端服务已启动（systemd 或 Docker）
- [ ] Nginx 已配置并运行
- [ ] 防火墙已开放 80/443 端口
- [ ] 域名已解析到服务器 IP（如有域名）
- [ ] SSL 证书已配置（HTTPS）
- [ ] Bark 推送测试成功
