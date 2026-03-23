# DocumentServer（AIECS 预构建镜像）

本目录不再包含补丁或本地构建：品牌与并发限制等已打入 **Artifact Registry** 中的镜像。

默认镜像（与 **AI-Execute-Services-Doc** 发布脚本推送的 `latest` 一致；需固定日期或 digest 时可改 `DOCUMENTSERVER_IMAGE`）：

`us-central1-docker.pkg.dev/ca-biz-kjmsdw-y59m/aiecs-mcp-servers/aiecs-documentserver:latest`

镜像来源与从源码构建流程见 **`AI-Execute-Services-Doc`** 仓库（根目录 `README.md` / `Dockerfile.documentserver`）。

## 启动

1. 已配置 Docker 拉取 GCP Artifact Registry：

   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

2. 在本目录：

   ```bash
   cp .env.example .env   # 可选：修改 JWT_SECRET、镜像 tag、端口
   docker compose pull
   docker compose up -d
   ```

3. 浏览器访问：`http://localhost:<DS_HTTP_PORT>/`（默认 `8080`）。

首次启动需等待内部服务就绪（约 1–3 分钟）。日志：`docker compose logs -f documentserver`。

## 配置

- `config/local.json.example` 可作为 JWT 等配置参考（按需挂载到容器内 `local.json` 路径，见官方 DocumentServer 文档）。
- 生产环境务必修改 **`JWT_SECRET`**。

## 与统一基础设施（infra）

仓库内 **`infra/docker-compose.yml`** 已改为使用同一镜像变量，不再从本目录 `Dockerfile` 构建。
