# AIECS-MCP 一键部署

一键部署 Stats-Tool、Scraper-Tool、PPT-Tool、DocumentServer、API-Tool（office-Tool 待实现）。

## 快速开始

```bash
cd deploy
cp .env.example .env
# 编辑 .env 配置 REDIS_PASSWORD、JWT_SECRET 等
./deploy.sh
```

## 前置条件

- Docker & Docker Compose
- Git（子模块需已克隆）
- DocumentServer：使用方案 A（官方镜像 + patch 覆盖），从 `DocumentServer/` 目录构建，或使用预构建镜像 `aiecs-documentserver-patched:latest`

## 端口

| 服务 | 端口 |
|------|------|
| API-Tool | 5050 |
| Scraper-Tool | 5055 |
| Stats-Tool | 5080 |
| PPT-Tool | 5000 |
| office-Tool | 5040 |
| DocumentServer | 8080 |
| Redis | 6379 |

## 配置说明

详见 [AIECS-MCP-DEPLOYMENT-DESIGN.md](../docs/AIECS-MCP-DEPLOYMENT-DESIGN.md)
