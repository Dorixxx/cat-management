#!/bin/bash
cd /Users/zhangwei03/Documents/Kimi/Workspaces/cat/cat-management/backend
export DATABASE_URL=sqlite:///./test_cat.db
/Users/zhangwei03/Library/Python/3.9/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 > /tmp/cat_server.log 2>&1 &
echo $! > /tmp/cat_server.pid
sleep 3
cat /tmp/cat_server.log
