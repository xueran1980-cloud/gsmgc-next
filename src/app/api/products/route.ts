// Next.js API Route — 代理到 WordPress 自定义端点 /products-raw
// ★ 全部走 /api/proxy/，不直连 api.gsmgc.es

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 读取前端传来的参数
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '24');
    const orderby = searchParams.get('orderby') || 'price';
    const order = searchParams.get('order') || 'desc';

    // ★ 透传 headers（cookie + auth）
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

    let products: any[] = json.products;

    // ★ 分类过滤 — 同时支持 ID 和 slug
    if (category) {
      const catId = parseInt(category);
      const isNumeric = !isNaN(catId);
      const catSlug = category.toLowerCase().trim();

      products = products.filter((p: any) => {
        if (!p.categories || !Array.isArray(p.categories)) return false;
        return p.categories.some((c: any) => {
          // 优先匹配 ID（数字查询）
          if (isNumeric && c.id === catId) return true;
          // 也匹配 slug（品牌用slug查询）
          if (catSlug && c.slug && String(c.slug).toLowerCase() === catSlug) return true;
          // 兜底：匹配名称
          if (catSlug && c.name && String(c.name).toLowerCase() === catSlug) return true;
          return false;
        });
      });

      console.log(`[API /products] Filtered by category="${category}" (id=${isNumeric ? catId : 'slug'}, slug="${catSlug}"): ${products.length} products`);
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

    return NextResponse.json({
      products: paginated,
      totalCount,
      totalPages,
      page,
      perPage,
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
