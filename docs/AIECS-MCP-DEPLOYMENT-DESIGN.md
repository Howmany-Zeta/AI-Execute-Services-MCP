# AIECS-MCP 底层构建完整部署方案

> 本文档描述 AIECS-MCP 一键部署架构，涵盖 DocumentServer-source 补丁流程、DocumentServer Docker 部署、office-Tool MCP 集成，以及所有 MCP 服务的统一编排。

---

## 目录

1. [架构总览](#1-架构总览)
2. [DocumentServer-source 补丁与 CI 流程](#2-documentserver-source-补丁与-ci-流程)
3. [DocumentServer 自建部署](#3-documentserver-自建部署)
4. [office-Tool MCP 集成](#4-office-tool-mcp-集成)
5. [一键部署方案](#5-一键部署方案)
6. [实施路线图](#6-实施路线图)

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AIECS-MCP 底层构建架构                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   API-Tool      │  │   Stats-Tool    │  │  Scraper-Tool   │                │
│  │   MCP (5050)    │  │   MCP (5080)    │  │   MCP (5055)    │                │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                │
│           │                    │                    │                          │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐                │
│  │   PPT-Tool      │  │   office-Tool   │  │  DocumentServer │                │
│  │   MCP (5000)    │  │   MCP (5040)    │  │  (8080)         │                │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                │
│           │                    │                    │                          │
│           │                    └──────────┬─────────┘                          │
│           │                               │                                     │
│           │                    ┌─────────▼─────────┐                           │
│           │                    │  DocumentServer   │  ← 自编译 OnlyOffice      │
│           │                    │  (Word/Excel/PPT) │     (去品牌 + 无并发限制)  │
│           │                    └──────────────────┘                           │
│           │                                                                     │
│  ┌────────▼────────────────────────────────────────────────────────────────┐   │
│  │  共享 Redis (可选)  │  共享网络  │  统一配置 (.env)                       │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 组件关系

| 组件 | 类型 | 职责 | 端口 |
|------|------|------|------|
| **API-Tool** | MCP Server | 外部 API 数据源（新闻、金融、天气等） | 5050 |
| **Stats-Tool** | MCP Server | 统计分析、数据可视化 | 5080 |
| **Scraper-Tool** | MCP Server | 网页爬取、内容提取 | 5055 |
| **PPT-Tool** | MCP Server | PPT 生成（Banana Slides） | 5000 |
| **office-Tool** | MCP Server | 文档编辑（Word/Excel/PPT） | 5040 |
| **DocumentServer** | 文档服务 | OnlyOffice 文档编辑引擎 | 8080 |

---

## 2. DocumentServer-source 补丁与 CI 流程

### 2.1 仓库定位

- **DocumentServer-source**：OnlyOffice 官方 DocumentServer 的 fork
- **职责**：在每次合并官方 upstream 后，自动应用补丁并触发 CI 构建

### 2.2 补丁内容

#### 补丁 1：去除 20 并发限制（server）

**文件**：`server/Common/sources/constants.js`

**修改**：
```javascript
// 原：exports.LICENSE_CONNECTIONS = 20;
exports.LICENSE_CONNECTIONS = 9999;  // 或足够大的数值（如 99999）
```

**说明**：AGPL v3 允许修改源码，仅需保留版权声明。

#### 补丁 2：去除 web-apps 品牌标识

**目标**：隐藏或移除 "Powered by OnlyOffice" 等品牌元素。

**常见位置**（需根据 web-apps 版本确认）：
- `web-apps/apps/common/main/resources/themes/` - 主题与 logo
- `web-apps/apps/common/main/resources/img/` - 图片资源
- `web-apps/apps/common/main/resources/css/` - 样式
- 可能涉及的选择器：`.ad-container`, `.powered-by-onlyoffice`, `[data-ad]` 等

**正确做法**：CSS 需有注入点，光 COPY 独立文件不会被加载。应**追加到现有 CSS 文件末尾**：

```dockerfile
# 在 Dockerfile 中追加到 app.css
RUN echo ".ad-container,.powered-by-onlyoffice{display:none!important}" \
  >> /var/www/onlyoffice/documentserver/web-apps/apps/common/main/resources/css/app.css
```

或修改 HTML 模板将自定义 CSS link 进去。路径需根据 OnlyOffice 版本确认。

### 2.3 补丁脚本结构

```
DocumentServer-source/
├── scripts/
│   ├── apply-patches.sh      # 主入口：合并后执行
│   ├── patches/
│   │   ├── server/
│   │   │   └── remove-connection-limit.patch
│   │   └── web-apps/
│   │       └── remove-branding.patch
│   └── merge-upstream.sh    # 合并 upstream + 应用补丁 + commit
├── .github/
│   └── workflows/
│       ├── build-on-push.yml       # push 后触发构建
│       └── merge-upstream.yml     # 定时或手动合并 upstream
└── .gitmodules
```

### 2.4 补丁脚本示例

**`scripts/apply-patches.sh`**：
```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[apply-patches] Applying patches..."

# 1. Server: 移除 20 并发限制
CONSTANTS_FILE="$REPO_ROOT/server/Common/sources/constants.js"
if [ -f "$CONSTANTS_FILE" ]; then
  sed -i 's/exports.LICENSE_CONNECTIONS = 20;/exports.LICENSE_CONNECTIONS = 9999;/' "$CONSTANTS_FILE"
  echo "  [OK] server: LICENSE_CONNECTIONS patched"
fi

# 2. Web-apps: 去除品牌（需根据实际路径调整）
# 可注入 CSS 或修改 JS 文件
# ...

echo "[apply-patches] Done."
```

**`scripts/merge-upstream.sh`**：
```bash
#!/bin/bash
set -e
# 1. 使用 mr 或 git submodule 更新所有子模块
# 2. 执行 apply-patches.sh
# 3. git add . && git commit -m "chore: apply patches after upstream merge"
# 4. git push origin
```

### 2.5 预构建镜像（当前）

> **本仓库 `DocumentServer/`** 不再包含 `patches` 或 `Dockerfile`：品牌与并发限制等已打入 **Artifact Registry** 镜像。

- **镜像**：`us-central1-docker.pkg.dev/ca-biz-kjmsdw-y59m/aiecs-mcp-servers/aiecs-documentserver`（默认 `:latest`，由 **AI-Execute-Services-Doc** 发布脚本推送；需固定版本时改为 `custom-YYYYMMDD` 或 `custom-YYYYMMDD-<sha>`，或设置 `DOCUMENTSERVER_IMAGE`）。
- **构建与补丁**：在独立仓库 **`AI-Execute-Services-Doc`** 中完成（`out/` 产物打补丁 → `Dockerfile.documentserver` → 推送至 GAR）。
- **CI**：本仓库不再包含 `build-documentserver-patched` 工作流；镜像发布在 GAR 或 CI 流水线中完成。

### 2.6 合并上游流程

1. 定期 `git fetch upstream` 并 `git merge upstream/main`
2. 执行 `git submodule update --remote` 更新子模块
3. 执行 `./scripts/apply-patches.sh`
4. 执行 `git add . && git commit -m "chore: merge upstream and apply patches"`
5. `git push origin main` → 触发 CI 构建

---

## 3. DocumentServer 自建部署

### 3.1 仓库定位

- **DocumentServer**：自建仓库，用于 Docker 部署
- **镜像来源**：基于官方 `onlyoffice/documentserver` + patch 覆盖构建的镜像（无 20 并发限制、去品牌），推送到 GHCR 或本地构建

### 3.2 目录结构

```
DocumentServer/
├── docker-compose.yml
├── .env.example
├── .env
├── config/
│   └── local.json          # OnlyOffice 配置
└── README.md
```

### 3.3 DocumentServer 依赖：PostgreSQL 与 RabbitMQ

**DocumentServer 必须依赖 PostgreSQL 和 RabbitMQ**，仅 Redis 会导致启动失败。依赖顺序：

```yaml
documentserver:
  depends_on:
    - postgresql
    - rabbitmq
    - redis
```

### 3.4 Docker Compose 示例

```yaml
# DocumentServer/docker-compose.yml
services:
  postgresql:
    image: postgres:14
    environment:
      POSTGRES_DB: onlyoffice
      POSTGRES_USER: onlyoffice
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: [pg_data:/var/lib/postgresql/data]
    networks: [aiecs-network]

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    networks: [aiecs-network]

  documentserver:
    image: ghcr.io/Howmany-Zeta/documentserver-patched:latest
    container_name: aiecs-documentserver
    restart: unless-stopped
    ports:
      - "8080:80"   # 避免占用 80，VM 上若有 nginx 可反向代理
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - documentserver_data:/var/www/onlyoffice/Data
      - documentserver_logs:/var/log/onlyoffice
    depends_on:
      - postgresql
      - rabbitmq
      - redis
    networks: [aiecs-network]

volumes:
  pg_data:
  documentserver_data:
  documentserver_logs:

networks:
  aiecs-network:
    external: true
```

### 3.5 端口与 Nginx 反向代理

DocumentServer 直接暴露 `80:80` 可能与 VM 上其他服务（nginx、其他 web）冲突。建议：

- 容器内端口映射为 `8080:80`，不占用 80
- 需要对外 80/443 时，用统一 nginx 做反向代理：

```yaml
documentserver:
  ports: ["8080:80"]

nginx-proxy:
  image: nginx:alpine
  ports: ["80:80", "443:443"]
  volumes: [./nginx.conf:/etc/nginx/nginx.conf]
```

### 3.6 配置说明

- `JWT_SECRET`：与前端、office-Tool 约定一致
- `POSTGRES_PASSWORD`、`RABBITMQ_USER`、`RABBITMQ_PASSWORD`：必填

---

## 4. office-Tool MCP 集成

### 4.1 仓库定位

- **office-Tool**：MCP Server，包装 DocumentServer
- **职责**：供前端 LLM 调用，实现文档创建、编辑、转换

### 4.2 功能设计

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 创建文档 | 根据模板或内容创建 docx/xlsx/pptx | 调用 DocumentServer API |
| 编辑文档 | 打开已有文档进行编辑 | 返回 DocumentEditor 嵌入 URL |
| 转换文档 | 格式转换（如 PDF→DOCX） | 调用 Conversion API |
| 文档协作 | 多人实时编辑 | 返回带 JWT 的编辑链接 |

### 4.3 技术栈

- **语言**：Python 3.11+
- **框架**：与 API-Tool/Stats-Tool 一致的 MCP 框架（aiecs）
- **通信**：HTTP 调用 DocumentServer REST API

### 4.4 环境变量

```bash
DOCUMENTSERVER_URL=http://documentserver:80  # 或宿主机地址
DOCUMENTSERVER_JWT_SECRET=${JWT_SECRET}
MCP_PORT=5040
```

### 4.5 工具列表（MCP Tools）

| Tool 名称 | 描述 |
|-----------|------|
| `office_create_document` | 创建空白或模板文档 |
| `office_edit_document` | 获取文档编辑链接 |
| `office_convert_document` | 格式转换 |
| `office_get_document_info` | 获取文档元信息 |

---

## 5. 一键部署方案

### 5.1 部署脚本位置

```
AIECS-MCP/
├── deploy/
│   ├── deploy.sh              # 一键部署入口
│   ├── docker-compose.yml     # 主编排文件
│   ├── .env.example
│   └── README.md
│
├── API-Tool/
├── Stats-Tool/
├── Scraper-Tool/
├── PPT-Tool/
├── office-Tool/
└── DocumentServer/
```

### 5.2 主编排文件 `deploy/docker-compose.yml`

```yaml
# AIECS-MCP 一键部署 - 主编排

services:
  # ========== MCP Servers ==========
  api-tool:
    build:
      context: ../API-Tool
      dockerfile: Dockerfile.mcp
    container_name: aiecs-api-tool
    ports: ["5050:5050"]
    env_file: .env
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on: [redis]
    networks: [aiecs-network]

  stats-tool:
    build:
      context: ../Stats-Tool
      dockerfile: Dockerfile.mcp
    container_name: aiecs-stats-tool
    ports: ["5080:5080"]
    env_file: .env
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on: [redis]
    networks: [aiecs-network]

  scraper-tool:
    build:
      context: ../Scraper-Tool
      dockerfile: Dockerfile.mcp
    container_name: aiecs-scraper-tool
    ports: ["5055:5055"]
    env_file: .env
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on: [redis]
    networks: [aiecs-network]

  ppt-tool:
    build:
      context: ../PPT-Tool
      dockerfile: backend/Dockerfile
    container_name: aiecs-ppt-tool
    ports: ["5000:5000"]
    env_file: .env
    networks: [aiecs-network]

  office-tool:
    build:
      context: ../office-Tool
      dockerfile: Dockerfile.mcp
    container_name: aiecs-office-tool
    ports: ["5040:5040"]
    env_file: .env
    environment:
      - DOCUMENTSERVER_URL=http://documentserver:80
      - DOCUMENTSERVER_JWT_SECRET=${JWT_SECRET}
    depends_on: [documentserver]
    networks: [aiecs-network]

  # ========== DocumentServer（需 PostgreSQL、RabbitMQ）==========
  postgresql:
    image: postgres:14
    environment:
      POSTGRES_DB: onlyoffice
      POSTGRES_USER: onlyoffice
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: [pg_data:/var/lib/postgresql/data]
    networks: [aiecs-network]

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    networks: [aiecs-network]

  documentserver:
    image: ghcr.io/Howmany-Zeta/documentserver-patched:latest
    container_name: aiecs-documentserver
    ports: ["8080:80"]
    env_file: .env
    volumes:
      - documentserver_data:/var/www/onlyoffice/Data
      - documentserver_logs:/var/log/onlyoffice
    depends_on:
      - postgresql
      - rabbitmq
      - redis
    networks: [aiecs-network]

  # ========== 共享 Redis ==========
  redis:
    image: redis:7-alpine
    container_name: aiecs-redis
    ports: ["6379:6379"]
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes: [redis_data:/data]
    networks: [aiecs-network]

volumes:
  pg_data:
  documentserver_data:
  documentserver_logs:
  redis_data:

networks:
  aiecs-network:
    driver: bridge
```

### 5.3 一键部署脚本 `deploy/deploy.sh`

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== AIECS-MCP 一键部署 ==="

# 1. 检查 .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "请编辑 .env 配置必要参数后重新运行"
  exit 1
fi

# 2. 初始化子模块（若尚未）
cd ..
git submodule update --init --recursive
cd deploy

# 3. 启动服务
docker compose up -d --build

# 4. 健康检查（DocumentServer 用 /healthcheck，返回 true 表示正常）
echo "等待服务启动..."
sleep 30
# MCP 服务用 /health，DocumentServer 用 /healthcheck
for port in 5050 5055 5080 5000 5040; do
  curl -sf "http://localhost:$port/health" >/dev/null 2>&1 && echo "  [OK] Port $port" || echo "  [--] Port $port"
done
curl -sf "http://localhost:8080/healthcheck" | grep -q true && echo "  [OK] DocumentServer (8080)" || echo "  [--] DocumentServer (8080)"

echo "=== 部署完成 ==="
echo "API-Tool:       http://localhost:5050"
echo "Stats-Tool:     http://localhost:5080"
echo "Scraper-Tool:   http://localhost:5055"
echo "PPT-Tool:       http://localhost:5000"
echo "office-Tool:    http://localhost:5040"
echo "DocumentServer: http://localhost:8080  (健康检查: /healthcheck)"
```

### 5.4 端口分配表

> **端口预留**：5000–5040 预留给 document tool 相关服务。

| 服务 | 端口 | 说明 |
|------|------|------|
| API-Tool | 5050 | MCP HTTP |
| Scraper-Tool | 5055 | MCP HTTP |
| Stats-Tool | 5080 | MCP HTTP |
| office-Tool | 5040 | MCP HTTP（document tool 预留段） |
| PPT-Tool | 5000 | Banana Slides Backend |
| DocumentServer | 8080（内部 80） | OnlyOffice |
| Redis | 6379 | 共享缓存 |

### 5.5 Redis 端口冲突处理

各子仓库原有 `docker-compose.mcp.yml` 将 Redis 映射到 `6380:6379` 以避免冲突。在一键部署中，所有服务共用同一 Redis，无需对外暴露，仅需在 `aiecs-network` 内通过 `redis:6379` 访问。

---

## 6. 实施路线图

### Phase 1：DocumentServer 预构建镜像（已完成 / 在独立仓库维护）

1. [x] 在 **AI-Execute-Services-Doc** 构建并推送 `aiecs-documentserver` 至 GAR（含去品牌、并发等）
2. [ ] 版本升级时：在 AI-Execute-Services-Doc 重新打补丁、构建并推送新 tag

### Phase 2：DocumentServer 部署（约 1 周）

1. [ ] 在 `DocumentServer` 中编写 `docker-compose.yml`
2. [ ] 配置 `local.json` 与 JWT
3. [ ] 验证镜像拉取与运行

### Phase 3：office-Tool 开发（2–3 周）

1. [ ] 搭建 office-Tool 项目结构（基于 aiecs 框架）
2. [ ] 实现 DocumentServer API 调用封装
3. [ ] 实现 MCP Tools：create_document、edit_document、convert_document
4. [ ] 编写 Dockerfile.mcp
5. [ ] 集成测试

### Phase 4：一键部署（约 1 周）

1. [ ] 创建 `deploy/` 目录与主 `docker-compose.yml`
2. [ ] 统一各服务 Redis 配置与网络
3. [ ] 编写 `deploy.sh` 与健康检查
4. [ ] 编写 `deploy/README.md` 与 `.env.example`
5. [ ] 端到端部署测试

### Phase 5：文档与维护

1. [ ] 更新主仓库 README
2. [ ] 编写运维手册（故障排查、日志、备份）
3. [ ] 建立定期合并 upstream 的流程

---

## 附录

### A. 子模块与 Git 结构

```
AIECS-MCP/
├── .gitmodules
├── API-Tool/          (submodule)
├── Stats-Tool/        (submodule)
├── Scraper-Tool/      (submodule)
├── PPT-Tool/          (submodule)
├── DocumentServer/    (待添加为 submodule)
├── office-Tool/       (待添加为 submodule)
└── DocumentServer-source/  (可选 submodule，用于补丁与 CI)
```

### B. 参考链接

- [OnlyOffice DocumentServer](https://github.com/ONLYOFFICE/DocumentServer)
- [OnlyOffice Server constants.js](https://github.com/ONLYOFFICE/server/blob/master/Common/sources/constants.js)
- [Document Server API](https://api.onlyoffice.com/editors/basic)
- [MCP Protocol](https://modelcontextprotocol.io/)
