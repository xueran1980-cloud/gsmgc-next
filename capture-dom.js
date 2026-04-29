// 1:1 对齐模式 - 线上 DOM 抓取脚本
// 抓取新旧站 3 个关键页面的完整 DOM 快照

const { chromium } = require('playwright');

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'tienda', path: '/tienda' },
];

async function captureSite(baseURL, siteLabel, outputDir) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  for (const { name, path } of PAGES) {
    console.log(`[${siteLabel}] Capturing ${path}...`);
    try {
      await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      // Wait a bit more for any lazy loading
      await page.waitForTimeout(2000);

      const html = await page.content();
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(outputDir, `${siteLabel}-${name}.html`), html, 'utf-8');

      // Also capture a screenshot
      await page.screenshot({ path: path.join(outputDir, `${siteLabel}-${name}.png`), fullPage: true });

      console.log(`[${siteLabel}] ${name}: ${Math.round(html.length / 1024)}KB`);
    } catch (e) {
      console.error(`[${siteLabel}] ${name}: ERROR - ${e.message}`);
    }
  }

  // Capture a product detail page - first find a product link from home or tienda
  console.log(`[${siteLabel}] Finding product link...`);
  try {
    await page.goto(`${baseURL}/tienda`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try to find a product link
    const productLinks = await page.$$eval('a[href*="/producto/"], a[href*="/product/"]', links => {
      return links.slice(0, 5).map(l => l.href);
    });

    if (productLinks.length > 0) {
      const productUrl = productLinks[0];
      console.log(`[${siteLabel}] Found product: ${productUrl}`);
      await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const html = await page.content();
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(outputDir, `${siteLabel}-producto.html`), html, 'utf-8');
      await page.screenshot({ path: path.join(outputDir, `${siteLabel}-producto.png`), fullPage: true });
      console.log(`[${siteLabel}] producto: ${Math.round(html.length / 1024)}KB`);
    } else {
      console.log(`[${siteLabel}] No product links found on tienda page`);
    }
  } catch (e) {
    console.error(`[${siteLabel}] producto: ERROR - ${e.message}`);
  }

  await browser.close();
  console.log(`[${siteLabel}] Done.\n`);
}

async function main() {
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.join(__dirname, '.workbuddy', 'dom-audit');
  fs.mkdirSync(outputDir, { recursive: true });

  // Capture old site (current live)
  await captureSite('https://gsmgc.es', 'old', outputDir);

  // Capture new site
  await captureSite('https://gsmgc-next.vercel.app', 'new', outputDir);

  console.log('All captures complete!');
}

main().catch(console.error);
