# OnlyOffice DocumentServer 并发限制验证

验证 `patches/constants.js` 中 `LICENSE_CONNECTIONS = 9999` 是否生效。

## 前置条件

1. DocumentServer 已启动（infra 中端口 8081）
2. 测试示例已启动：
   ```bash
   docker exec aiecs-documentserver sudo supervisorctl start ds:example
   ```

## 方式一：手动测试（推荐，最准确）

用浏览器打开 `test-manual.html`，点击「批量打开编辑器标签页」或「复制链接」后手动打开 25+ 个标签页，检查第 21、22、23… 个是否正常加载编辑器。

- **patch 生效**：25+ 个标签页都能正常显示编辑器
- **未 patch**：第 21 个起出现 "Connection limit" 等错误

## 方式二：自动化脚本

```bash
cd concurrent-test
npm install
npm test        # 默认 25 个并发
node test-concurrent.js 40  # 自定义并发数
```

- 若环境有 Chrome/Puppeteer 依赖：会启动真实浏览器，验证编辑器连接
- 若缺少依赖（如 libatk）：会退化为 fetch 模式，仅验证 API 并发（不足以证明连接限制）

## 环境变量

- `DOCUMENTSERVER_URL`：DocumentServer 地址，默认 `http://127.0.0.1:8081`
