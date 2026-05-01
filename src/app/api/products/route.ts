// Next.js API Route — 代理到 WooCommerce REST API
// 接收前端参数 → 透传给 WC REST API → 返回已排序/筛选结果
// 前端只做渲染，所有业务逻辑在 WC 后端完成或服务端完成

import { NextRequest, NextResponse } from 'next/server';

const WC_API_URL = 'https://api.gsmgc.es/wp-json/wc/v3/products';
const WC_CAT_URL = 'https://api.gsmgc.es/wp-json/wc/v3/products/categories';
const WC_KEY = process.env.WC_KEY!;
const WC_SECRET = process.env.WC_SECRET!;

// Fallback 类型模式（服务端复制，用于杂牌产品名称匹配）
const FALLBACK_TYPE_PATTERNS: { slug: string; patterns: RegExp[] }[] = [
  {
    slug: 'cables-cargadores',
    patterns: [/\bcable\s+(type[ -]?c|lightning|usb[- ]?c)\s+/i, /\bcable\s+(datos|carga)\s+/i, /\bcargador\s+(type[ -]?c\s+to\s+lightning|con\s+cable|red|pared)/i],
  },
  {
    slug: 'auriculares',
    patterns: [/\bauricular(es)?\s*(bluetooth|\s*stereo)?$/i, /\baud[i\u00ED]fono(s)?\s*$/i],
  },
  {
    slug: 'camaras',
    patterns: [/\bcamara\s+(trasera|frontal|original|compatib)/i, /\blente\s+de\s+camara\b/i],
  },
  {
    slug: 'placas-flex',
    patterns: [/\bplaca\s+(de\s+)?carga\s+/i, /\bflex\s+(main\s+para|de\s+carga\s+)/i],
  },
];

function matchFallbackType(productName: string, typeSlug: string): boolean {
  const typeDef = FALLBACK_TYPE_PATTERNS.find(t => t.slug === typeSlug);
  if (!typeDef) return false;
  return typeDef.patterns.some(p => p.test(productName));
}

// 构建 WC 认证参数
function wcAuthParams(): string {
  const p = new URLSearchParams();
  p.set('consumer_key', WC_KEY);
  p.set('consumer_secret', WC_SECRET);
  return p.toString();
}

// 获取所有分类（带缓存）
let _categoriesCache: any[] | null = null;
let _categoriesCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

async function fetchAllCategories(): Promise<any[]> {
  const now = Date.now();
  if (_categoriesCache && (now - _categoriesCacheTime) < CACHE_TTL) {
    return _categoriesCache;
  }

  let allCats: any[] = [];
  let page = 1;
  while (true) {
    const url = `${WC_CAT_URL}?${wcAuthParams()}&per_page=100&page=${page}&hide_empty=true`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    allCats = allCats.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  _categoriesCache = allCats;
  _categoriesCacheTime = now;
  return allCats;
}

// 获取所有产品（用于 fallback 类型过滤）
async function fetchAllProducts(): Promise<any[]> {
  let allProducts: any[] = [];
  let page = 1;
  while (true) {
    const url = `${WC_API_URL}?${wcAuthParams()}&per_page=100&page=${page}&status=publish`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    allProducts = allProducts.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  return allProducts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const orderby = searchParams.get('orderby') || 'price';
    const order = searchParams.get('order') || 'desc';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || ''; // ★ 方案 B：服务端 type 过滤
    const perPage = parseInt(searchParams.get('per_page') || '24');
    const page = parseInt(searchParams.get('page') || '1');

    // 如果传了 type 参数 → 服务端过滤
    if (type) {
      return await handleTypeFilter(type, { orderby, order, category, search, perPage, page });
    }

    // 无 type 参数 → 直接透传给 WC REST API
    const wcParams = new URLSearchParams();
    wcParams.set('consumer_key', WC_KEY);
    wcParams.set('consumer_secret', WC_SECRET);
    wcParams.set('per_page', String(perPage));
    wcParams.set('page', String(page));
    wcParams.set('status', 'publish');
    wcParams.set('orderby', orderby);
    wcParams.set('order', order);
    if (category) wcParams.set('category', category);
    if (search) wcParams.set('search', search);

    const res = await fetch(`${WC_API_URL}?${wcParams.toString()}`, {
      headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[API /products] WC REST API error:', res.status, text);
      return NextResponse.json(
        { success: false, error: `WC API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err: any) {
    console.error('[API /products] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * 处理 type 过滤（方案 B 核心）
 * 1. 尝试匹配分类 slug → 用分类 ID 调用 WC API
 * 2. 若匹配 fallback 类型 → 获取产品后按名称模式过滤
 */
async function handleTypeFilter(
  typeSlug: string,
  opts: { orderby: string; order: string; category: string; search: string; perPage: number; page: number }
) {
  try {
    // 1. 获取所有分类，尝试匹配 typeSlug
    const allCats = await fetchAllCategories();
    const matchedCat = allCats.find(
      c => (c.slug || '').toLowerCase() === typeSlug.toLowerCase()
    );

    if (matchedCat) {
      // 是分类 → 用分类 ID 调用 WC API
      const wcParams = new URLSearchParams();
      wcParams.set('consumer_key', WC_KEY);
      wcParams.set('consumer_secret', WC_SECRET);
      wcParams.set('per_page', String(opts.perPage));
      wcParams.set('page', String(opts.page));
      wcParams.set('status', 'publish');
      wcParams.set('orderby', opts.orderby);
      wcParams.set('order', opts.order);
      wcParams.set('category', String(matchedCat.id));
      if (opts.search) wcParams.set('search', opts.search);

      const res = await fetch(`${WC_API_URL}?${wcParams.toString()}`, {
        headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0', 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[API /products/type] WC error:', res.status, text);
        return NextResponse.json(
          { success: false, error: `WC API returned ${res.status}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
      });
    }

    // 2. 不是分类 → 检查是否是 fallback 类型
    const fallbackDef = FALLBACK_TYPE_PATTERNS.find(
      t => t.slug === typeSlug.toLowerCase()
    );

    if (!fallbackDef) {
      // 未知 type → 返回空结果
      return NextResponse.json([], {
        headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=5' },
      });
    }

    // 3. 获取所有产品，按 fallback 模式过滤
    const allProducts = await fetchAllProducts();

    // 获取品牌分类名称（用于排除有品牌分类的产品）
    const KNOWN_BRANDS = new Set([
      'APPLE', 'IPHONE', 'IPAD', 'SAMSUNG', 'XIAOMI', 'HUAWEI', 'OPPO',
      'VIVO', 'ONEPLUS', 'MOTOROLA', 'TCL', 'ZTE', 'ALCATEL', 'NOKIA',
      'HONOR', 'LENOVO', 'REALME', 'GOOGLE', 'SONY', 'LG', 'ASUS', 'BLACKBERRY',
    ]);
    const EXCLUDED = new Set(['sin categorizar', 'uncategorized', 'sin categoria', 'otros', 'op', 'otro', 'misc', 'varios']);
    const TYPE_KEYWORDS = ['ACCESORIOS', 'AUDIO', 'BATERIA', 'BATERIAS', 'BAT', 'CABLE', 'CABLES', 'CARGADOR', 'CARGADORES', 'FUNDAS', 'FUNDA', 'HERRAMIENTAS', 'HERRAMIENTA', 'CAMARA', 'CAMARAS', 'PANTALLA', 'PANTALLAS', 'PLACA', 'FLEX', 'PROTECTOR', 'PROTECTORES'];

    const brandCatNames = new Set(
      allCats
        .filter(c => {
          if (c.parent !== 0) return false;
          const n = (c.name || '').trim().toUpperCase();
          if (EXCLUDED.has(n)) return false;
          if (KNOWN_BRANDS.has(n)) return true;
          for (const kw of TYPE_KEYWORDS) { if (n.includes(kw)) return false; }
          return true;
        })
        .map(c => c.name)
    );

    // 过滤：没有品牌分类 且 名称匹配 fallback 模式
    const filtered = allProducts.filter(p => {
      const hasBrandCat = (p.categories || []).some((c: any) => brandCatNames.has(c.name));
      if (hasBrandCat) return false;
      return matchFallbackType(p.name || '', typeSlug);
    });

    // 排序
    const sorted = sortProducts(filtered, opts.orderby, opts.order);

    // 分页
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / opts.perPage);
    const start = (opts.page - 1) * opts.perPage;
    const paginated = sorted.slice(start, start + opts.perPage);

    return NextResponse.json(paginated, {
      headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=5' },
    });
  } catch (err: any) {
    console.error('[API /products/type] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * 前端排序逻辑的服务端实现（对齐 WC 排序规则）
 */
function sortProducts(products: any[], orderby: string, order: string): any[] {
  const sorted = [...products];
  const dir = order === 'asc' ? 1 : -1;

  switch (orderby) {
    case 'price':
      sorted.sort((a, b) => dir * ((a.price || 0) - (b.price || 0)));
      break;
    case 'date':
      sorted.sort((a, b) => dir * (new Date(b.date_created).getTime() - new Date(a.date_created).getTime()));
      break;
    case 'popularity':
      sorted.sort((a, b) => dir * ((b.total_sales || 0) - (a.total_sales || 0)));
      break;
    case 'title':
      sorted.sort((a, b) => dir * (a.name || '').localeCompare(b.name || ''));
      break;
    default:
      // 默认 price-desc
      sorted.sort((a, b) => -1 * ((a.price || 0) - (b.price || 0)));
  }
  return sorted;
}
