// scripts/update-product-ids.mjs
// 从 API 获取所有产品 ID + slug，写入 public/product-ids.json
// 用法: node scripts/update-product-ids.mjs
// 每次 API 数据变更后运行一次（新/删/改产品时）

import { writeFileSync } from 'fs';
import { join } from 'path';

const API = 'https://api.gsmgc.es/wp-json/gsmgc/v1/products-raw';

function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('Fetching products from API...');
  const res = await fetch(API, {
    headers: { 'User-Agent': 'GSMGC-Bot/1.0' },
  });

  if (!res.ok) {
    console.error(`API returned ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  const products = data.products || [];

  const staticParams = products
    .filter((p) => p.status === 'publish')
    .map((p) => ({
      id: String(p.id),
      slug: generateSlug(p.name) || 'producto',
    }));

  const filePath = join(process.cwd(), 'public', 'product-ids.json');
  writeFileSync(filePath, JSON.stringify(staticParams, null, 0));

  console.log(`✅ Written ${staticParams.length} product IDs to ${filePath}`);
  console.log(`   File size: ${(Buffer.byteLength(JSON.stringify(staticParams, null, 0)) / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
