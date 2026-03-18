# OnlyOffice 嵌入测试 - 紧凑工具栏配置 （not ready）

验证 `compactToolbar`、`compactHeader`、`toolbarHideFileName` 等配置效果。

## 用法

```bash
cd embed-test
npm install
npm start
```

浏览器打开 http://127.0.0.1:3999 ，点击「加载编辑器」。

## 配置说明

- **DocumentServer**：OnlyOffice Document Server 地址（默认 `http://127.0.0.1:8081`）
- **BASE_URL**：本测试服务的地址，Document Server 需能访问此地址以拉取文档和回调。**默认**为 `http://host.docker.internal:3999`，适用于 Document Server 在 Docker 内、测试服务在宿主机的情况。

### Document Server 与本服务同机且非 Docker 时

```bash
BASE_URL=http://127.0.0.1:3999 npm start
```

### Document Server 在 Linux Docker 内（无 host.docker.internal）时

```bash
BASE_URL=http://172.17.0.1:3999 npm start
```

页面中「存储服务 BASE_URL」输入框需与上述一致。

## 当前传入的 editorConfig.customization

```json
{
  "compactToolbar": true,
  "compactHeader": true,
  "toolbarHideFileName": true
}
```
