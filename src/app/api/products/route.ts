// Next.js API Route — 代理到 WordPress 自定义端点 /products-raw
// ★ 生产：走 /api/proxy/ | 开发：本地 fixture（绕过 SG CAPTCHA）

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// ========== 公共逻辑：过滤+排序+分页 ==========

interface FilterParams {
  category: string;
  search: string;
  page: number;
  perPage: number;
  orderby: string;
  order: string;
}

function applyFilters(products: any[], params: FilterParams) {
  const { category, search, page, perPage, orderby, order } = params;

  // 分类过滤 — 三模匹配（ID/slug/name）
  if (category) {
    const catId = parseInt(category);
    const isNumeric = !isNaN(catId);
    const catSlug = category.toLowerCase().trim();

    console.log('[FILTER DEBUG]', JSON.stringify({
      inputCategory: category, isNumeric,
      catId: isNumeric ? catId : null, catSlug,
      totalBeforeFilter: products.length,
    }));

    products = products.filter((p: any) => {
      if (!p.categories || !Array.isArray(p.categories)) return false;
      return p.categories.some((c: any) => {
        if (isNumeric && c.id === catId) return true;
        if (catSlug && c.slug && String(c.slug).toLowerCase() === catSlug) return true;
        if (catSlug && c.name && String(c.name).toLowerCase() === catSlug) return true;
        return false;
      });
    });

    console.log(`[FILTER DEBUG] result: ${products.length} products matched (filtered from ${params.category})`);
  }

  // 搜索过滤
  if (search) {
    const lower = search.toLowerCase();
    products = products.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(lower) || sku.includes(lower);
    });
  }

  // 排序
  products.sort((a: any, b: any) => {
    let va: any, vb: any;
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
    return order === 'asc' ? va - vb : vb - va;
  });

  // 分页
  const totalCount = products.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const paginated = products.slice((page - 1) * perPage, page * perPage);

  return { paginated, totalCount, totalPages };
}

// ========== 数据源 ==========

// 开发模式：使用本地 fixture
function loadDevFixture(): any[] | null {
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    const raw = readFileSync(
      join(process.cwd(), 'fixtures', 'products-raw.json'),
      'utf-8'
    );
    const json = JSON.parse(raw);
    if (json.success && Array.isArray(json.products)) {
      console.log(`[DEV FIXTURE] /products loaded from fixture (${json.products.length} products)`);
      return json.products;
    }
  } catch (e) {
    console.warn('[DEV FIXTURE] Failed to load products fixture:', (e as Error).message);
  }
  return null;
}

// ========== Route Handler ==========

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params: FilterParams = {
      category: searchParams.get('category') || '',
      search: searchParams.get('search') || '',
      page: parseInt(searchParams.get('page') || '1'),
      perPage: parseInt(searchParams.get('per_page') || '24'),
      orderby: searchParams.get('orderby') || 'price',
      order: searchParams.get('order') || 'desc',
    };

    // ★ 开发模式：使用 fixture 数据
    const devData = loadDevFixture();
    if (devData) {
      const { paginated, totalCount, totalPages } = applyFilters([...devData], params);
      return NextResponse.json({
        products: paginated, totalCount, totalPages,
        page: params.page, perPage: params.perPage,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // ★ 生产模式：走代理
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'GSMGC-Next-Server/1.0',
      'Accept': 'application/json',
    };
    const authHeader = request.headers.get('Authorization');
    if (authHeader) proxyHeaders['Authorization'] = authHeader;
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader;

    const proxyUrl = `${request.nextUrl.origin}/api/proxy/wp-json/gsmgc/v1/products-raw`;

    const res = await fetch(proxyUrl, {
      headers: proxyHeaders,
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[API /products] /products-raw error:', res.status, text.slice(0, 200));
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.products)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from backend' },
        { status: 502 }
      );
    }

    const { paginated, totalCount, totalPages } = applyFilters(json.products, params);

    return NextResponse.json({
      products: paginated, totalCount, totalPages,
      page: params.page, perPage: params.perPage,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[API /products] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
