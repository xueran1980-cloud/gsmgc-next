// Next.js API Route — 代理到 WordPress 自定义端点 /products-raw
// 数据最终来源仍是 WooCommerce（由 mu-plugins 内部调用 WC REST API）
// 前端只做渲染，分类统一使用 WC 分类系统

import { NextRequest, NextResponse } from 'next/server';

const WP_PRODUCTS_RAW = 'https://api.gsmgc.es/wp-json/gsmgc/v1/products-raw';

/**
 * 将 WC REST API 参数映射到 /products-raw 支持的参数
 */
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

    // ★ 直接请求 api.gsmgc.es（不走 rewrite），透传登录态
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'GSMGC-Next-Proxy/1.0',
      'Accept': 'application/json',
    };
    // 透传 Authorization（Bearer token）
    const authHeader = request.headers.get('Authorization');
    if (authHeader) proxyHeaders['Authorization'] = authHeader;
    // 透传 cookie（如果有 WP logged-in cookie）
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader;

    const res = await fetch(WP_PRODUCTS_RAW, {
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

    // ★ 前端传来的参数在 Next.js 端执行过滤/排序/分页
    // （因为 /products-raw 返回全量数据，前端参数需要服务端处理）
    let products: any[] = json.products;

    // 分类过滤
    if (category) {
      const catId = parseInt(category);
      products = products.filter((p: any) =>
        p.categories && p.categories.some((c: any) => c.id === catId)
      );
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

    return NextResponse.json(paginated, {
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
