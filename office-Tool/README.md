# office-Tool

MCP Server，包装 DocumentServer（OnlyOffice），供前端 LLM 调用实现文档创建、编辑、转换。

## 状态

**待开发**。设计见 [AIECS-MCP-DEPLOYMENT-DESIGN.md](../docs/AIECS-MCP-DEPLOYMENT-DESIGN.md) 第 4 节。

## 计划功能

| Tool | 描述 |
|------|------|
| `office_create_document` | 创建空白或模板文档 |
| `office_edit_document` | 获取文档编辑链接 |
| `office_convert_document` | 格式转换 |
| `office_get_document_info` | 获取文档元信息 |

## 技术栈

- Python 3.11+
- aiecs MCP 框架（与 API-Tool/Stats-Tool 一致）
- DocumentServer REST API

## 环境变量

```
DOCUMENTSERVER_URL=http://documentserver:80
DOCUMENTSERVER_JWT_SECRET=${JWT_SECRET}
MCP_PORT=5040
```
