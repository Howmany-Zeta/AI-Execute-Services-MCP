#!/usr/bin/env node
/**
 * OnlyOffice 嵌入测试 - 简易文档存储服务
 * 提供 config API、callback 处理、sample.docx
 */
import express from "express";
import archiver from "archiver";
import { Readable } from "node:stream";

const PORT = process.env.PORT || 3999;
// Document Server 在 Docker 内时需用 host.docker.internal 才能访问宿主机服务
const BASE_URL = process.env.BASE_URL || `http://host.docker.internal:${PORT}`;

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 生成最小可用 docx（zip 格式）
function createMinimalDocx() {
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>OnlyOffice 嵌入测试 - 紧凑工具栏</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault/><w:pPrDefault/></w:docDefaults>
</w:styles>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">
  <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Test</dc:title>
  <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Embed Test</dc:creator>
</cp:coreProperties>`,
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>OnlyOffice Embed Test</Application>
</Properties>`,
  };

  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks = [];
    archive.on("data", (c) => chunks.push(c));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    for (const [path, content] of Object.entries(files)) {
      archive.append(content, { name: path });
    }
    archive.finalize();
  });
}

let sampleDocxBuffer = null;

// 提供 sample.docx
app.get("/sample.docx", async (req, res) => {
  if (!sampleDocxBuffer) sampleDocxBuffer = await createMinimalDocx();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", "inline; filename=sample.docx");
  res.send(sampleDocxBuffer);
});

// 提供编辑器配置（含 compactToolbar 等）
app.get("/api/config", (req, res) => {
  const baseUrl = (req.query.baseUrl || BASE_URL).replace(/\/$/, "");
  const docServer = (req.query.docServer || "http://127.0.0.1:8081").replace(/\/$/, "");
  const docKey = `embed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const config = {
    documentType: "word",
    document: {
      fileType: "docx",
      key: docKey,
      title: "compact-toolbar-test.docx",
      url: `${baseUrl}/sample.docx`,
    },
    editorConfig: {
      callbackUrl: `${baseUrl}/callback`,
      lang: "zh-CN",
      customization: {
        compactToolbar: true,
        compactHeader: true,
        toolbarHideFileName: true,
      },
      user: {
        id: "embed-test-user",
        name: "测试用户",
      },
    },
    width: "100%",
    height: "100%",
    type: "desktop",
  };

  res.json(config);
});

// Document Server callback
app.post("/callback", (req, res) => {
  const { status, key } = req.body || {};
  if (status === 2 || status === 6) {
    console.log(`[callback] 文档 ${key} 待保存 (status=${status})`);
  } else if (status === 4) {
    console.log(`[callback] 文档 ${key} 已关闭无修改`);
  }
  res.json({ error: 0 });
});

// 静态页面
app.get("/", (req, res) => {
  const host = (req.get("host") || `127.0.0.1:${PORT}`).split(":")[0];
  const docServer = req.query.docServer || `http://${host}:8081`;
  const pageBaseUrl = `http://${host}:${PORT}`;
  res.send(`
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OnlyOffice 嵌入测试 - 紧凑工具栏</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui; }
    .toolbar { padding: 8px 12px; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .toolbar label { font-size: 14px; }
    .toolbar input { padding: 4px 8px; width: 200px; }
    .toolbar button { padding: 6px 12px; cursor: pointer; background: #0066cc; color: white; border: none; border-radius: 4px; }
    .toolbar button:hover { background: #0052a3; }
    #placeholder { height: calc(100vh - 50px); }
  </style>
</head>
<body>
  <div class="toolbar">
    <label>DocumentServer: <input id="docServer" value="${docServer}" /></label>
    <label>存储服务 BASE_URL: <input id="baseUrl" value="${pageBaseUrl}" placeholder="Document Server 需能访问" /></label>
    <button onclick="loadEditor()">加载编辑器</button>
  </div>
  <div id="placeholder"></div>

  <script>
    function loadEditor() {
      var docServer = document.getElementById('docServer').value.replace(/\/$/, '');
      var baseUrl = document.getElementById('baseUrl').value.replace(/\/$/, '');
      var configUrl = baseUrl + '/api/config?docServer=' + encodeURIComponent(docServer) + '&baseUrl=' + encodeURIComponent(baseUrl);
      fetch(configUrl)
        .then(function(r) { return r.json(); })
        .then(function(config) {
          var apiUrl = docServer + '/web-apps/apps/api/documents/api.js';
          if (!window.DocsAPI) {
            var s = document.createElement('script');
            s.src = apiUrl;
            s.onload = function() { init(config); };
            s.onerror = function() { alert('DocsAPI 脚本加载失败，请检查 DocumentServer 地址'); };
            document.head.appendChild(s);
          } else {
            init(config);
          }
        })
        .catch(function(e) { console.error(e); alert('获取配置失败: ' + e.message); });
    }

    function init(config) {
      document.getElementById('placeholder').innerHTML = '';
      try {
        new DocsAPI.DocEditor('placeholder', config);
      } catch (e) {
        console.error(e);
        alert('初始化编辑器失败: ' + (e.message || e));
      }
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OnlyOffice 嵌入测试服务: http://127.0.0.1:${PORT}`);
  console.log(`BASE_URL=${BASE_URL} (Document Server 需能访问此地址)`);
  console.log(`若 Document Server 与本服务同机非 Docker，可设置: BASE_URL=http://127.0.0.1:${PORT}`);
});
