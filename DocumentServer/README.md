# DocumentServer

基于 OnlyOffice 官方镜像 + patch 覆盖（方案 A），去除 20 并发限制并隐藏品牌。

## 补丁说明

- **patches/constants.js**：基于 [ONLYOFFICE/server master](https://github.com/ONLYOFFICE/server/blob/master/Common/sources/constants.js) 最新源码，将 `LICENSE_CONNECTIONS` 从 20 改为 9999。
- **品牌去除**：在 Dockerfile 中追加 CSS 到 `app.css`，隐藏 `.ad-container`、`.powered-by-onlyoffice` 等元素。

## 构建

```bash
docker build -t aiecs-documentserver-patched:latest .
# 或指定基础版本
docker build --build-arg ONLYOFFICE_VERSION=8.1.3 -t aiecs-documentserver-patched:8.1.3 .
```

## 补丁更新

当 OnlyOffice 升级时，从 [ONLYOFFICE/server](https://github.com/ONLYOFFICE/server) 拉取最新 `Common/sources/constants.js`，仅修改 `LICENSE_CONNECTIONS` 行，更新 `patches/constants.js` 后重新构建。
