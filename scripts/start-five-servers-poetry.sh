#!/usr/bin/env bash
# 使用 Poetry 同时启动五个服务（API-Tool、Office-Tool、PPT-Tool、Scraper-Tool、Stats-Tool）。
# 不启动 DocumentServer，不使用 Docker。
# 各项目在各自目录下读取 .env；端口由各项目 MCP_PORT / BACKEND_PORT 等配置决定。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v poetry >/dev/null 2>&1; then
  echo "错误: 未找到 poetry，请先安装 Poetry。" >&2
  exit 1
fi

PIDS=()
CLEANED=0

cleanup() {
  if (( CLEANED )); then
    return 0
  fi
  CLEANED=1
  echo ""
  echo "正在停止子进程..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

start_mcp() {
  local name="$1"
  local dir="$2"
  (
    cd "$ROOT/$dir"
    exec poetry run python -m aiecs.main_mcp
  ) &
  local pid=$!
  PIDS+=("$pid")
  echo "[start-five-servers] $name -> PID $pid (目录: $dir, aiecs.main_mcp)"
}

start_ppt() {
  (
    cd "$ROOT/PPT-Tool"
    export PYTHONPATH="$ROOT/PPT-Tool"
    exec poetry run python backend/app.py
  ) &
  local pid=$!
  PIDS+=("$pid")
  echo "[start-five-servers] PPT-Tool -> PID $pid (目录: PPT-Tool, backend/app.py)"
}

start_mcp "API-Tool" "API-Tool"
start_mcp "Office-Tool" "Office-Tool"
start_mcp "Scraper-Tool" "Scraper-Tool"
start_mcp "Stats-Tool" "Stats-Tool"
start_ppt

echo ""
echo "五个进程已启动；日志会交错输出到本终端。按 Ctrl+C 全部停止。"
echo "默认端口参考 deploy/deploy.sh 健康检查: API 5050, Scraper 5055, Stats 5080, Office 5040, PPT 5000（以 .env 为准）。"
echo ""

wait
