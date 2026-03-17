#!/bin/bash
# AIECS-MCP 一键部署脚本
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  AIECS-MCP 一键部署"
echo "=========================================="

# 1. 检查 .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "[!] 已创建 .env，请编辑配置必要参数后重新运行:"
    echo "    - REDIS_PASSWORD"
    echo "    - JWT_SECRET"
    echo "    - POSTGRES_PASSWORD"
    echo "    - RABBITMQ_PASSWORD"
    echo "    - AI 相关配置（PPT-Tool 需要）"
    exit 1
  else
    echo "[!] 缺少 .env 文件"
    exit 1
  fi
fi

# 2. 初始化子模块
echo "[1/4] 初始化子模块..."
cd ..
git submodule update --init --recursive 2>/dev/null || true
cd "$SCRIPT_DIR"

# 3. 构建并启动
echo "[2/4] 构建并启动服务..."
docker compose up -d --build

# 4. 等待启动
echo "[3/4] 等待服务启动 (30s)..."
sleep 30

# 5. 健康检查（MCP 用 /health，DocumentServer 用 /healthcheck 返回 true）
echo "[4/4] 健康检查..."
for item in 5050:API-Tool 5055:Scraper-Tool 5080:Stats-Tool 5000:PPT-Tool; do
  port="${item%%:*}"
  name="${item##*:}"
  if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
    echo "  [OK] $name (port $port)"
  else
    echo "  [--] $name (port $port) - 可能未就绪"
  fi
done
if curl -sf "http://localhost:8080/healthcheck" 2>/dev/null | grep -q true; then
  echo "  [OK] DocumentServer (port 8080, /healthcheck)"
else
  echo "  [--] DocumentServer (port 8080) - 可能未就绪，首次启动需 60-120s"
fi

echo ""
echo "=========================================="
echo "  部署完成"
echo "=========================================="
echo "API-Tool:       http://localhost:5050"
echo "Stats-Tool:     http://localhost:5080"
echo "Scraper-Tool:   http://localhost:5055"
echo "PPT-Tool:       http://localhost:5000"
echo "DocumentServer: http://localhost:8080  (健康检查: /healthcheck)"
echo "office-Tool:    http://localhost:5040 (待实现)"
echo ""
echo "停止服务: cd deploy && docker compose down"
