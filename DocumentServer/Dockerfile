# DocumentServer - 方案 A：官方镜像 + patch 文件覆盖
# 基于 onlyoffice/documentserver 最新版，覆盖 constants.js 去除 20 并发限制，
# 追加 CSS 去除品牌。patch 文件基于 ONLYOFFICE/server master 最新源码。
# 参考: https://github.com/ONLYOFFICE/server/blob/master/Common/sources/constants.js

ARG ONLYOFFICE_VERSION=latest
FROM onlyoffice/documentserver:${ONLYOFFICE_VERSION}

# 覆盖 constants.js（docservice 为 pkg 二进制，此文件不生效，仅保留供参考）
COPY patches/constants.js \
  /var/www/onlyoffice/documentserver/server/Common/sources/constants.js

# 品牌去除 1：用透明图替换左上角 logo（最可靠）
COPY patches/transparent-logo.svg /tmp/transparent-logo.svg
RUN for logo in \
    /var/www/onlyoffice/documentserver/web-apps/apps/common/main/resources/img/header/header-logo_s.svg \
    /var/www/onlyoffice/documentserver/web-apps/apps/common/main/resources/img/header/dark-logo_s.svg; do \
  if [ -f "$logo" ]; then \
    cp /tmp/transparent-logo.svg "$logo"; \
    gzip -9 -c /tmp/transparent-logo.svg > "${logo}.gz" 2>/dev/null || true; \
  fi; \
  done && rm /tmp/transparent-logo.svg

# 品牌去除 2：追加 CSS 隐藏广告/品牌元素
COPY patches/brand-remove.css /tmp/brand-remove.css
RUN for css in \
    /var/www/onlyoffice/documentserver/web-apps/apps/documenteditor/main/resources/css/app.css \
    /var/www/onlyoffice/documentserver/web-apps/apps/presentationeditor/main/resources/css/app.css \
    /var/www/onlyoffice/documentserver/web-apps/apps/spreadsheeteditor/main/resources/css/app.css \
    /var/www/onlyoffice/documentserver/web-apps/apps/pdfeditor/main/resources/css/app.css \
    /var/www/onlyoffice/documentserver/web-apps/apps/visioeditor/main/resources/css/app.css; do \
  if [ -f "$css" ]; then cat /tmp/brand-remove.css >> "$css"; fi; \
  done && rm /tmp/brand-remove.css
