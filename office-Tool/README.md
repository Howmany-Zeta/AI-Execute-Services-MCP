# office-Tool

MCP Server，包装 DocumentServer（OnlyOffice），供 LLM 通过 **JS DSL 脚本** 实现文档创建、编辑、转换等操作。

## 设计方式

采用 **JS DSL 执行** 而非固定方法：LLM 输出 JS DSL 脚本，office-Tool 在沙箱中执行并调用 DocumentServer API。相比 4 个固定 Tool，更灵活、可组合、Token 效率更高。

## 状态

**待开发**。设计见 [AIECS-MCP-DEPLOYMENT-DESIGN.md](../docs/AIECS-MCP-DEPLOYMENT-DESIGN.md) 第 4 节。

## 核心 Tool

| Tool | 描述 |
|------|------|
| `office_execute_dsl` | 执行 JS DSL 脚本，完成文档操作并返回结果 |

## DSL 能力

DSL 脚本可调用以下能力（由 office-Tool 提供运行时）：

- **create**：创建空白或模板文档（docx/xlsx/pptx）
- **convert**：格式转换（如 docx→pdf）
- **getEditUrl**：获取文档编辑/预览链接
- **getInfo**：获取文档元信息
- **insertText**：插入文本（需 Document Builder 支持）

LLM 可组合多步操作、条件分支、错误处理，一次脚本完成复杂流程。

## DSL 示例

```javascript
// 创建文档并转换为 PDF
doc.create("docx", { template: "blank" })
   .insertText("Hello World", { position: "end" })
   .convert("pdf")
   .then(doc => doc.getEditUrl());
```

或声明式 JSON：

```json
{
  "actions": [
    { "create": { "type": "docx" } },
    { "insertText": { "content": "Hello", "at": "end" } },
    { "convert": { "to": "pdf" } }
  ]
}
```

## 技术栈

- Python 3.11+
- aiecs MCP 框架（与 API-Tool/Stats-Tool 一致）
- DocumentServer REST API（Conversion、Document Builder、Command Service）
- JS 沙箱执行（如 QuickJS / PyMiniRacer）

## 环境变量

```
DOCUMENTSERVER_URL=http://documentserver:80
DOCUMENTSERVER_JWT_SECRET=${JWT_SECRET}
MCP_PORT=5040
```
