# DocumentServer - 方案 A：官方镜像 + patch 文件覆盖
# 基于 onlyoffice/documentserver 最新版，覆盖 constants.js 去除 20 并发限制，
# 追加 CSS 去除品牌。patch 文件基于 ONLYOFFICE/server master 最新源码。
# 参考: https://github.com/ONLYOFFICE/server/blob/master/Common/sources/constants.js

ARG ONLYOFFICE_VERSION=latest
FROM onlyoffice/documentserver:${ONLYOFFICE_VERSION}

# 覆盖 constants.js，去除 20 并发限制
COPY patches/constants.js \
  /var/www/onlyoffice/documentserver/server/Common/sources/constants.js

# 品牌去除：追加到现有 CSS 文件末尾（光 COPY 独立 CSS 不会被加载）
# 路径可能随 OnlyOffice 版本变化，若不存在则跳过
RUN APP_CSS="/var/www/onlyoffice/documentserver/web-apps/apps/common/main/resources/css/app.css" && \
  if [ -f "$APP_CSS" ]; then \
    echo ".ad-container,.powered-by-onlyoffice,[data-ad=\"onlyoffice\"]{display:none!important}" >> "$APP_CSS"; \
  else \
    FIND_CSS=$(find /var/www/onlyoffice/documentserver/web-apps -name "*.css" -path "*common*" 2>/dev/null | head -1); \
    if [ -n "$FIND_CSS" ]; then echo ".ad-container,.powered-by-onlyoffice{display:none!important}" >> "$FIND_CSS"; fi; \
  fi
