#!/usr/bin/env node
/**
 * OnlyOffice DocumentServer 并发限制验证压测
 *
 * 验证 LICENSE_CONNECTIONS patch 是否生效：
 * - 未 patch：第 21 个连接应失败（20 并发限制）
 * - 已 patch：25+ 个连接应全部成功
 *
 * 前置条件：
 * 1. DocumentServer 运行在 localhost:8081
 * 2. 已启动测试示例: docker exec aiecs-documentserver sudo supervisorctl start ds:example
 *
 * 用法: node test-concurrent.js [并发数]
 * 默认: 25 个并发
 *
 * 若 Puppeteer 无法启动（缺少 libatk 等），请使用 test-manual.html 手动测试
 */

const DOCUMENTSERVER_URL = process.env.DOCUMENTSERVER_URL || 'http://127.0.0.1:8081';
const EXAMPLE_BASE = `${DOCUMENTSERVER_URL}/example`;
const CONCURRENT_COUNT = parseInt(process.argv[2] || '25', 10);

async function runWithPuppeteer() {
  const puppeteer = require('puppeteer');
  const PAGE_TIMEOUT = 45000;

  async function openEditorPage(browser, index) {
    const page = await browser.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT);
    const url = `${EXAMPLE_BASE}/editor?fileExt=docx&_t=${Date.now()}-${index}`;
    let success = false;
    let errorMsg = null;

    try {
      const [response] = await Promise.all([
        page.goto(url, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT }),
      ]);
      if (response && !response.ok()) {
        errorMsg = `HTTP ${response.status()}`;
        return { index, success: false, error: errorMsg };
      }
      await page.waitForTimeout(3000);
      const hasEditor = await page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          if (iframe.src && (iframe.src.includes('documentserver') || iframe.src.includes('web-apps')))
            return true;
        }
        return !!(
          document.querySelector('#placeholder') ||
          document.querySelector('[id*="editor"]') ||
          document.querySelector('.documentserver-editor')
        );
      });
      const hasError = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes('connection limit') ||
          text.includes('connections limit') ||
          (text.includes('license') && text.includes('connection')) ||
          text.includes('too many connections')
        );
      });
      success = hasEditor && !hasError;
      if (!success && !hasError) errorMsg = hasEditor ? 'unknown' : 'editor not loaded';
      else if (hasError) errorMsg = 'connection limit or license error';
    } catch (err) {
      errorMsg = err.message || String(err);
    } finally {
      await page.close();
    }
    return { index, success, error: errorMsg };
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const startTime = Date.now();
  const tasks = Array.from({ length: CONCURRENT_COUNT }, (_, i) => openEditorPage(browser, i));
  const results = await Promise.all(tasks);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  await browser.close();

  return { results, elapsed };
}

async function runWithFetch() {
  // 备选：仅验证文档创建 API 可并发响应（不触发编辑器连接限制）
  const startTime = Date.now();
  const urls = Array.from(
    { length: CONCURRENT_COUNT },
    (_, i) => `${EXAMPLE_BASE}/editor?fileExt=docx&_t=${Date.now()}-${i}`
  );
  const responses = await Promise.all(
    urls.map((url) =>
      fetch(url, { redirect: 'follow' }).then((r) => ({ ok: r.ok, status: r.status }))
    )
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const results = responses.map((r, i) => ({
    index: i,
    success: r.ok,
    error: r.ok ? null : `HTTP ${r.status}`,
  }));
  return { results, elapsed };
}

function printResults(results, elapsed, count) {
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n--- 结果 ---`);
  console.log(`成功: ${succeeded.length}/${count}`);
  console.log(`失败: ${failed.length}/${count}`);
  console.log(`耗时: ${elapsed}s`);

  if (failed.length > 0) {
    console.log(`\n失败连接:`);
    failed.slice(0, 10).forEach((r) => console.log(`  #${r.index}: ${r.error}`));
    if (failed.length > 10) console.log(`  ... 还有 ${failed.length - 10} 个`);
  }

  const verdict =
    failed.length === 0
      ? `\n✓ API 并发: ${count} 个请求全部成功`
      : succeeded.length >= 21
        ? `\n✓ 通过: 第 21+ 个连接仍可成功`
        : succeeded.length <= 20 && failed.length > 0
          ? `\n✗ 可能未 patch: 仅 ${succeeded.length} 个成功，疑似 20 并发限制`
          : `\n? 需人工确认`;

  console.log(verdict);
}

async function main() {
  console.log(`\n=== OnlyOffice 并发限制验证 ===`);
  console.log(`DocumentServer: ${DOCUMENTSERVER_URL}`);
  console.log(`并发数: ${CONCURRENT_COUNT}`);
  console.log(`预期: patch 后 20+ 连接应全部成功\n`);

  let out;
  try {
    out = await runWithPuppeteer();
  } catch (err) {
    if (err.message && (err.message.includes('libatk') || err.message.includes('launch'))) {
      console.log('Puppeteer 无法启动（缺少 Chrome 依赖），改用 fetch 模式');
      console.log('注意: fetch 仅验证页面请求，编辑器连接限制需用 test-manual.html 手动验证\n');
      out = await runWithFetch();
    } else {
      throw err;
    }
  }

  printResults(out.results, out.elapsed, CONCURRENT_COUNT);
  const failed = out.results.filter((r) => !r.success);
  process.exit(failed.length > 0 && out.results.filter((r) => r.success).length < 21 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
