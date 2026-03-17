# AIECS-MCP

AI Execute Services - MCP 工具集与底层构建。

## 子模块

| 模块 | 描述 |
|------|------|
| API-Tool | 外部 API 数据源 MCP（新闻、金融、天气等） |
| Stats-Tool | 统计分析、数据可视化 MCP |
| Scraper-Tool | 网页爬取 MCP |
| PPT-Tool | PPT 生成 MCP（Banana Slides） |
| office-Tool | 文档编辑 MCP（待开发） |
| DocumentServer | OnlyOffice 文档服务 |
| DocumentServer-source | OnlyOffice 源码 fork（补丁与 CI） |

## 一键部署

```bash
cd deploy
cp .env.example .env
# 编辑 .env 配置
./deploy.sh
```

详见 [docs/AIECS-MCP-DEPLOYMENT-DESIGN.md](docs/AIECS-MCP-DEPLOYMENT-DESIGN.md)。

## 架构概览

```
前端/LLM
    │
    ├── API-Tool (5050)    ─┐
    ├── Stats-Tool (5080)   │
    ├── Scraper-Tool (5055) ├── MCP Servers
    ├── PPT-Tool (5000)     │
    └── office-Tool (5040) ─┘
              │
              └── DocumentServer (80)  ← OnlyOffice
```
