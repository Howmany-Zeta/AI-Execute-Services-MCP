# 统一测试基础设施 (Unified Test Infrastructure)

统一管理测试环境所需的基础服务：PostgreSQL、Redis、RabbitMQ、Nginx、DocumentServer(OnlyOffice)。

## 服务列表

| 服务 | 说明 | 端口 |
|------|------|------|
| db | PostgreSQL (document_server) | 5432 |
| db_onlyoffice | PostgreSQL (OnlyOffice 专用) | 5433 |
| redis_cache | Redis 缓存 | 6380 |
| rabbitmq | RabbitMQ 消息队列 | 5672, 15672(管理界面) |
| documentserver | OnlyOffice 文档服务 | 8081 |
| web | Nginx | 80, 443 |

## 启动 DocumentServer

```bash
cd infra
cp .env.example .env   # 首次需配置 .env
docker compose up -d documentserver
```

DocumentServer 依赖 `db_onlyoffice`、`rabbitmq`、`redis_cache`，会自动启动。

**注意**：首次启动 DocumentServer 需 60–120 秒完成初始化，健康检查：`curl http://localhost:8081/healthcheck`

## 环境变量

见 `.env.example`，复制为 `.env` 后按需修改。

## 与 AI-Execute-Services-MCP 集成

- DocumentServer 从 `../AI-Execute-Services-MCP/DocumentServer` 构建（含 patch：去品牌、无 20 并发限制）
- office-Tool 等 MCP 服务可通过 `http://documentserver:80` 或 `http://localhost:8081` 访问
