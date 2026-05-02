#!/usr/bin/env node
/**
 * Legacy vs New Site 1:1 对比系统
 *
 * 用法:
 *   node scripts/compare-legacy-vs-new.mjs                    # 全量对比
 *   node scripts/compare-legacy-vs-new.mjs --brand samsung    # 单品牌
 *   node scripts/compare-legacy-vs-new.mjs --brand samsung --page 2
 *   node scripts/compare-legacy-vs-new.mjs --search "pantalla iphone"
 *   node scripts/compare-legacy-vs-new.mjs --product 10578    # 单产品
 *
 * 数据源:
 *   Legacy: https://gsmgc.es/api/proxy/wp-json/gsmgc/v1/products-raw
 *   New:    http://localhost:3000/api/products
 *
 * 对比维度:
 *   1. 产品数量 (按品牌)
 *   2. 排序结果 (前 5 个)
 *   3. 价格格式 (西班牙语)
 *   4. 搜索匹配 (前 5 个)
 *   5. 标题显示
 *   6. 分页元数据
 */

import { parseArgs } from 'node:util';

// ========== 配置 ==========
const LEGACY_BASE = 'https://gsmgc.es/api/proxy/wp-json/gsmgc/v1';
const NEW_BASE = 'http://localhost:3000/api';

const TEST_BRANDS = ['samsung', 'iphone', 'xiaomi', 'huawei', 'oppo'];
const TEST_SEARCHES = ['pantalla iphone', 'cargador samsung', 'funda', 'bateria'];
const TEST_PER_PAGE = 24;

// ========== 工具函数 ==========

function formatPriceES(value) {
  const n = parseFloat(value);
  if (isNaN(n)) return '0,00 €';
  const intPart = Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = n.toFixed(2).split('.')[1];
  return `${intPart},${decPart} €`;
}

function calcIGIC(base) {
  return Math.round(base * 1.07 * 100) / 100;
}

function formatTitle(name, maxChars = 60) {
  if (!name) return { display: '', full: '', truncated: false };
  const t = name.trim();
  if (t.length <= maxChars) return { display: t, full: t, truncated: false };
  let cut = t.substring(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.7) cut = cut.substring(0, lastSpace);
  return { display: cut + '...', full: t, truncated: true };
}

// Legacy SPA 客户端逻辑模拟（对齐旧站 TiendaPage.jsx）
// ★ slug only — brand = product_cat 视图，slug 是唯一标准
function filterByCategory(products, category) {
  if (!category) return products;
  const catSlug = category.toLowerCase().trim();

  return products.filter(p => {
    if (!p.categories) return false;
    return p.categories.some(c =>
      c.slug && String(c.slug).toLowerCase() === catSlug
    );
  });
}

function searchProducts(products, query) {
  if (!query) return products;
  const lower = query.toLowerCase().trim();

  // WC 风格加权搜索（与新站一致）
  const scored = products.map(p => {
    let score = 0;
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    if (name === lower) score += 100;
    if (sku === lower) score += 90;
    if (name.startsWith(lower)) score += 50;
    if (sku.startsWith(lower)) score += 40;
    if (name.includes(lower)) score += 20;
    if (sku.includes(lower)) score += 10;
    return { product: p, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

function sortProducts(products, orderby = 'popularity', order = 'desc') {
  return [...products].sort((a, b) => {
    let va, vb;
    if (orderby === 'price') {
      va = parseFloat(a.price || '0');
      vb = parseFloat(b.price || '0');
    } else if (orderby === 'title') {
      return order === 'asc'
        ? (a.name || '').localeCompare(b.name || '', 'es')
        : (b.name || '').localeCompare(a.name || '', 'es');
    } else if (orderby === 'date') {
      va = new Date(a.date_created || 0).getTime();
      vb = new Date(b.date_created || 0).getTime();
    } else if (orderby === 'popularity') {
      va = parseInt(a.total_sales || '0');
      vb = parseInt(b.total_sales || '0');
    } else {
      va = parseFloat(a.price || '0');
      vb = parseFloat(b.price || '0');
    }
    const cmp = order === 'asc' ? va - vb : vb - va;
    // 二级键：同值按 ID 排序（确定性 tie-break）
    if (cmp === 0) {
      return order === 'asc' ? (a.id - b.id) : (b.id - a.id);
    }
    return cmp;
  });
}

// ========== 数据获取 ==========

async function fetchLegacy() {
  const t0 = Date.now();
  const res = await fetch(`${LEGACY_BASE}/products-raw`);
  if (!res.ok) throw new Error(`Legacy fetch failed: ${res.status}`);
  const json = await res.json();
  const t1 = Date.now();
  return {
    products: json.products || [],
    count: json.count || 0,
    cachedAt: json.cached_at || null,
    fetchMs: t1 - t0,
  };
}

async function fetchNew(params = {}) {
  const url = new URL(`${NEW_BASE}/products`);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.page) url.searchParams.set('page', String(params.page));
  url.searchParams.set('per_page', String(params.per_page || TEST_PER_PAGE));
  if (params.orderby) url.searchParams.set('orderby', params.orderby);
  if (params.order) url.searchParams.set('order', params.order);

  const t0 = Date.now();
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`New fetch failed: ${res.status} for ${url}`);
  const json = await res.json();
  const t1 = Date.now();
  return { ...json, fetchMs: t1 - t0 };
}

async function fetchNewProduct(productId) {
  // 产品详情页：先获取产品列表找 slug
  const t0 = Date.now();
  const res = await fetch(`${NEW_BASE}/products?per_page=5000`);
  const json = await res.json();
  const product = json.products?.find(p => p.id === productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  const t1 = Date.now();
  return { product, fetchMs: t1 - t0 };
}

// ========== 对比逻辑 ==========

function compareCounts(legacy, newResult, label) {
  const legacyCount = legacy.products.length;
  const newCount = newResult.totalCount;
  const match = legacyCount === newCount;
  return {
    label,
    legacyCount,
    newCount,
    match,
    diff: newCount - legacyCount,
    status: match ? '✅' : '❌',
  };
}

function compareFirstN(legacy, newResult, n = 5) {
  const diffs = [];
  const maxN = Math.min(n, legacy.products.length, newResult.products.length);

  for (let i = 0; i < maxN; i++) {
    const l = legacy.products[i];
    const n = newResult.products[i];
    const legacyPrice = formatPriceES(l.price);
    const newPrice = formatPriceES(n.price);
    const legacyTitle = formatTitle(l.name);
    const newTitle = formatTitle(n.name);

    const issues = [];
    if (l.id !== n.id) issues.push(`ID mismatch: ${l.id} ≠ ${n.id}`);
    if (legacyTitle.display !== newTitle.display) issues.push(`TITLE: "${legacyTitle.display}" ≠ "${newTitle.display}"`);
    if (legacyPrice !== newPrice) issues.push(`PRICE: ${legacyPrice} ≠ ${newPrice}`);
    if (l.sku !== n.sku) issues.push(`SKU: ${l.sku} ≠ ${n.sku}`);

    if (issues.length > 0) {
      diffs.push({
        position: i + 1,
        legacy: { id: l.id, name: legacyTitle.display, price: legacyPrice, sku: l.sku },
        new: { id: n.id, name: newTitle.display, price: newPrice, sku: n.sku },
        issues,
      });
    }
  }

  // Check if products count differs beyond n
  if (legacy.products.length < n && newResult.products.length >= n) {
    diffs.push({ position: `legacy:${legacy.products.length}+`, issues: ['Legacy has fewer products'] });
  }
  if (newResult.products.length < n && legacy.products.length >= n) {
    diffs.push({ position: `new:${newResult.products.length}+`, issues: ['New has fewer products'] });
  }

  return diffs;
}

function comparePagination(legacy, newResult, perPage) {
  const expectedPages = Math.ceil(legacy.products.length / perPage);
  const actualPages = newResult.totalPages;
  const match = expectedPages === actualPages;
  return {
    legacyTotal: legacy.products.length,
    newTotalCount: newResult.totalCount,
    perPage,
    legacyExpectedPages: expectedPages,
    newTotalPages: actualPages,
    match,
    status: match ? '✅' : '❌',
  };
}

function comparePriceFormat() {
  // 检查价格格式是否正确
  const testCases = [
    { input: '10.00', expected: '10,00 €' },
    { input: '0.20', expected: '0,20 €' },
    { input: '208.00', expected: '208,00 €' },
    { input: '1.5', expected: '1,50 €' },
    { input: '0', expected: '0,00 €' },
  ];
  const results = testCases.map(({ input, expected }) => {
    const got = formatPriceES(input);
    return { input, expected, got, pass: got === expected };
  });
  const allPass = results.every(r => r.pass);
  return { format: 'Spanish (comma decimal)', tests: results, allPass };
}

function compareSearch(legacyRaw, query) {
  // 对新站 API 做搜索请求
  const legacyResults = searchProducts(legacyRaw, query);
  const legacyIds = new Set(legacyResults.slice(0, 10).map(p => p.id));
  return {
    query,
    legacyFound: legacyResults.length,
    legacyTopIds: [...legacyIds],
  };
}

// ========== 报告生成 ==========

function generateReport(diff) {
  const lines = [];
  const divider = '─'.repeat(60);

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════╗');
  lines.push('║   Legacy vs New Site 1:1 对比报告                    ║');
  lines.push('║   gsmgc.es (旧 Vite SPA)  vs  Next.js (新站)        ║');
  lines.push(`║   时间: ${new Date().toISOString().slice(0, 19)}                 ║`);
  lines.push('╚══════════════════════════════════════════════════════╝');
  lines.push('');

  // === 1. 数据源状态 ===
  lines.push('📡 数据源状态');
  lines.push(divider);
  lines.push(`  Legacy: ${diff.source.legacyCount} products, fetch ${diff.source.legacyFetchMs}ms`);
  if (diff.source.legacyCachedAt) {
    lines.push(`          cached at ${diff.source.legacyCachedAt}`);
  }
  lines.push(`  New:    ${diff.source.newTotalCount} products, fetch ${diff.source.newFetchMs}ms (page 1)`);
  lines.push('');

  // === 2. 产品总数对比 ===
  lines.push('📊 产品总数对比 (按品牌)');
  lines.push(divider);
  lines.push('  Brand         Legacy   New     Match');
  lines.push('  ' + '─'.repeat(45));
  for (const c of diff.brandCounts) {
    const icon = c.match ? '✅' : '❌';
    const lPad = String(c.legacyCount).padStart(6);
    const nPad = String(c.newCount).padStart(6);
    lines.push(`  ${c.label.padEnd(12)} ${lPad}  ${nPad}  ${icon}`);
  }
  lines.push('');

  // === 3. 排序对比 ===
  lines.push('🔢 排序对比 (前5个产品)');
  lines.push(divider);
  for (const [brand, sortDiffs] of Object.entries(diff.sortComparison)) {
    lines.push(`  📌 ${brand} (popularity-desc):`);
    if (sortDiffs.length === 0) {
      lines.push('     ✅ 完全一致');
    } else {
      for (const sd of sortDiffs) {
        lines.push(`     #${sd.position}: ❌`);
        for (const issue of sd.issues) {
          lines.push(`        ${issue}`);
        }
      }
    }
  }
  lines.push('');

  // === 4. 搜索对比 ===
  lines.push('🔍 搜索对比');
  lines.push(divider);
  for (const s of diff.searchResults) {
    lines.push(`  "${s.query}": legacy=${s.legacyFound} results`);
    if (s.newFound !== undefined) {
      const match = s.legacyFound === s.newFound ? '✅' : '❌';
      lines.push(`    new=${s.newFound} ${match}`);
    }
  }
  lines.push('');

  // === 5. 价格格式 ===
  lines.push('💰 价格格式验证');
  lines.push(divider);
  const pf = diff.priceFormat;
  lines.push(`  格式: ${pf.format}`);
  lines.push(`  全部通过: ${pf.allPass ? '✅' : '❌'}`);
  if (!pf.allPass) {
    for (const t of pf.tests) {
      if (!t.pass) lines.push(`    ❌ ${t.input} → got "${t.got}" expected "${t.expected}"`);
    }
  }
  lines.push('');

  // === 6. 分页对比 ===
  lines.push('📄 分页对比');
  lines.push(divider);
  for (const p of diff.pagination) {
    const icon = p.match ? '✅' : '❌';
    lines.push(`  ${p.iconName || 'All'}: ${p.legacyTotal} products / ${p.perPage} per page`);
    lines.push(`    Legacy: ${p.legacyExpectedPages} pages | New: ${p.newTotalPages} pages ${icon}`);
  }
  lines.push('');

  // === 7. 标题显示对比 ===
  lines.push('✏️ 标题显示对比 (示例)');
  lines.push(divider);
  if (diff.titleSamples && diff.titleSamples.length > 0) {
    for (const ts of diff.titleSamples.slice(0, 3)) {
      const t = formatTitle(ts.name);
      lines.push(`  Raw:   ${ts.name}`);
      lines.push(`  Display: ${t.display}`);
      lines.push(`  Truncated: ${t.truncated ? 'Yes' : 'No'}`);
      lines.push('');
    }
  }
  lines.push('');

  // === 总结 ===
  const totalChecks = diff.brandCounts.filter(c => c.match).length;
  const totalBrands = diff.brandCounts.length;
  const sortIssues = Object.values(diff.sortComparison).flat().length;
  const allGood = totalChecks === totalBrands && sortIssues === 0 && diff.priceFormat.allPass;

  lines.push('═'.repeat(60));
  lines.push(`📋 总结: ${totalChecks}/${totalBrands} 品牌数量一致, ${sortIssues} 排序差异`);
  lines.push(`   价格格式: ${diff.priceFormat.allPass ? '✅' : '❌'}`);
  lines.push(`   整体状态: ${allGood ? '✅ ALL GOOD' : '⚠️ HAS DIFFERENCES'}`);
  lines.push('═'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

// ========== 主流程 ==========

async function main() {
  const { values } = parseArgs({
    options: {
      brand: { type: 'string', short: 'b' },
      page: { type: 'string', short: 'p' },
      search: { type: 'string', short: 's' },
      product: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    console.log(`
Usage: node scripts/compare-legacy-vs-new.mjs [options]

Options:
  --brand, -b <slug>   对比单个品牌 (默认: 全部)
  --page, -p <n>       指定页码
  --search, -s <query> 搜索查询
  --product <id>       对比单个产品详情
  --help, -h           显示帮助

Examples:
  node scripts/compare-legacy-vs-new.mjs
  node scripts/compare-legacy-vs-new.mjs --brand samsung
  node scripts/compare-legacy-vs-new.mjs --search "pantalla iphone"
    `);
    return;
  }

  console.log('🔄 获取数据...');

  // 获取数据
  const legacy = await fetchLegacy();
  const newAll = await fetchNew({ per_page: 5000 }); // 获取大量产品用于对比
  const newFirst = await fetchNew();

  const diff = {
    source: {
      legacyCount: legacy.count,
      legacyFetchMs: legacy.fetchMs,
      legacyCachedAt: legacy.cachedAt,
      newTotalCount: newFirst.totalCount,
      newFetchMs: newFirst.fetchMs,
    },
    brandCounts: [],
    sortComparison: {},
    searchResults: [],
    priceFormat: comparePriceFormat(),
    pagination: [],
    titleSamples: [],
  };

  // === 产品总数对比 (按品牌) ===
  const brands = values.brand ? [values.brand] : TEST_BRANDS;
  for (const brand of brands) {
    const legacyFiltered = sortProducts(filterByCategory(legacy.products, brand));
    const newResult = await fetchNew({ category: brand });

    diff.brandCounts.push(compareCounts(
      { products: legacyFiltered },
      newResult,
      brand
    ));

    // 排序对比
    const sortDiffs = compareFirstN({ products: legacyFiltered }, newResult, 5);
    diff.sortComparison[brand] = sortDiffs;

    // 分页对比
    diff.pagination.push({
      ...comparePagination({ products: legacyFiltered }, newResult, TEST_PER_PAGE),
      iconName: brand,
    });
  }

  // === 搜索对比 ===
  const searches = values.search ? [values.search] : TEST_SEARCHES;
  for (const query of searches) {
    const legacyResults = compareSearch(legacy.products, query);
    try {
      const newSearchResult = await fetchNew({ search: query });
      diff.searchResults.push({
        ...legacyResults,
        newFound: newSearchResult.totalCount,
      });
    } catch (e) {
      diff.searchResults.push({
        ...legacyResults,
        newFound: undefined,
        error: e.message,
      });
    }
  }

  // === 标题显示对比 ===
  const sampleProducts = legacy.products.slice(0, 5);
  const longProducts = legacy.products.filter(p => p.name && p.name.length > 60).slice(0, 3);
  diff.titleSamples = [...sampleProducts, ...longProducts].map(p => ({ name: p.name }));

  // === 单产品对比 ===
  if (values.product) {
    const legacyProduct = legacy.products.find(p => String(p.id) === values.product);
    if (legacyProduct) {
      try {
        const newProduct = await fetchNewProduct(parseInt(values.product));
        diff.singleProduct = {
          legacy: {
            id: legacyProduct.id,
            name: legacyProduct.name,
            price: formatPriceES(legacyProduct.price),
            sku: legacyProduct.sku,
            stock: legacyProduct.stock_status,
          },
          new: {
            id: newProduct.product.id,
            name: newProduct.product.name,
            price: formatPriceES(newProduct.product.price),
            sku: newProduct.product.sku,
            stock: newProduct.product.stock_status,
          },
        };
      } catch (e) {
        diff.singleProduct = { error: e.message };
      }
    }
  }

  // 生成报告
  const report = generateReport(diff);
  console.log(report);

  // 如果有单产品对比
  if (diff.singleProduct && !diff.singleProduct.error) {
    console.log('📦 单产品详情对比');
    console.log('─'.repeat(60));
    console.log('  Legacy:', JSON.stringify(diff.singleProduct.legacy, null, 2));
    console.log('  New:', JSON.stringify(diff.singleProduct.new, null, 2));
    const match = JSON.stringify(diff.singleProduct.legacy) === JSON.stringify(diff.singleProduct.new);
    console.log(`  Status: ${match ? '✅ Identical' : '❌ Different'}`);
    console.log('');
  }

  // 写报告文件
  const reportPath = new URL('../comparison-legacy-vs-new.md', import.meta.url);
  const fs = await import('fs');
  fs.writeFileSync(reportPath, report);
  console.log(`📝 Report saved: ${reportPath.pathname}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
