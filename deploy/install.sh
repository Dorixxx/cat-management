#!/bin/bash
# 猫咪管理系统 - 传统方式部署脚本
# 适用于 Ubuntu 22.04/24.04 或 CentOS 8+

set -e

APP_DIR="/opt/cat-management"
DB_USER="postgres"
DB_NAME="cat_management"
DB_PASSWORD="postgres"  # 生产环境请修改！

echo "🐱 开始部署猫咪管理系统..."

# 1. 更新系统
echo "📦 更新系统包..."
if command -v apt &> /dev/null; then
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib git curl
elif command -v yum &> /dev/null; then
    sudo yum update -y
    sudo yum install -y python3 python3-pip nginx postgresql-server postgresql-contrib git curl
fi

# 2. 配置 PostgreSQL
echo "🐘 配置 PostgreSQL..."
if command -v apt &> /dev/null; then
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
else
    sudo postgresql-setup --initdb 2>/dev/null || true
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# 3. 创建应用目录
echo "📁 创建应用目录..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# 4. 上传代码（这里假设代码已通过 git clone 或 scp 上传）
echo "📂 请确保代码已上传到 $APP_DIR"
echo "   可以使用: git clone <你的仓库地址> $APP_DIR"
echo "   或: scp -r ./cat-management user@server:$APP_DIR"

# 5. 创建 Python 虚拟环境
echo "🐍 创建 Python 虚拟环境..."
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # 生产服务器

# 6. 配置环境变量
echo "⚙️ 配置环境变量..."
cat > $APP_DIR/backend/.env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
BARK_KEY=${BARK_KEY:-}
BARK_SERVER=https://api.day.app
EOF

# 7. 初始化数据库表
echo "🗄️ 初始化数据库..."
cd $APP_DIR/backend
python3 -c "
import sys
sys.path.insert(0, '.')
from app.database import engine, Base
Base.metadata.create_all(bind=engine)
print('数据库表创建成功')
"

# 8. 配置 Systemd 服务
echo "🔧 配置 Systemd 服务..."
sudo cp $APP_DIR/deploy/cat-management.service /etc/systemd/system/
sudo sed -i "s|/opt/cat-management|$APP_DIR|g" /etc/systemd/system/cat-management.service
sudo systemctl daemon-reload
sudo systemctl enable cat-management

# 9. 配置 Nginx
echo "🌐 配置 Nginx..."
sudo cp $APP_DIR/deploy/nginx-site.conf /etc/nginx/sites-available/cat-management
sudo ln -sf /etc/nginx/sites-available/cat-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# 10. 配置防火墙
echo "🔥 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "🚀 启动服务:"
echo "   sudo systemctl start cat-management"
echo ""
echo "📊 查看状态:"
echo "   sudo systemctl status cat-management"
echo "   sudo journalctl -u cat-management -f"
echo ""
echo "🌐 访问地址:"
echo "   http://$(curl -s ifconfig.me || echo '你的服务器IP')"
echo ""
echo "⚠️  重要提醒:"
echo "   1. 修改 /etc/systemd/system/cat-management.service 中的 BARK_KEY"
echo "   2. 修改数据库密码（当前为默认密码）"
echo "   3. 配置域名和 SSL 证书（推荐使用 Let's Encrypt）"
