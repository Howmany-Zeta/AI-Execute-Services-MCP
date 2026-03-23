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
- DocumentServer：使用预构建镜像 `DOCUMENTSERVER_IMAGE`（默认 GCP Artifact Registry `aiecs-documentserver`；已含去品牌与并发等）。部署前需 `gcloud auth configure-docker us-central1-docker.pkg.dev`；镜像构建与补丁流程见 **`AI-Execute-Services-Doc`** 仓库（非本仓库）

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
