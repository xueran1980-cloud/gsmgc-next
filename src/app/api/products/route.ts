// Next.js API Route — 纯代理到 WooCommerce REST API
// 所有产品数据来自 /wp-json/wc/v3/products（实时，无缓存）
// 前端只做渲染，分类统一使用 WC 分类系统（category 参数）

import { NextRequest, NextResponse } from 'next/server';

const WC_API_URL = 'https://api.gsmgc.es/wp-json/wc/v3/products';
const WC_KEY = process.env.WC_KEY!;
const WC_SECRET = process.env.WC_SECRET!;

/**
 * 构建 WC 认证参数
 */
function wcAuthParams(): string {
  const p = new URLSearchParams();
  p.set('consumer_key', WC_KEY);
  p.set('consumer_secret', WC_SECRET);
  return p.toString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ★ 查询单个产品（by ID）→ 直接透传 WC API
    const id = searchParams.get('id');
    if (id) {
      return await handleSingleProduct(id);
    }

    // ★ 列表查询：透传参数到 WC REST API
    const orderby = searchParams.get('orderby') || 'price';
    const order = searchParams.get('order') || 'desc';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const perPage = parseInt(searchParams.get('per_page') || '24');
    const page = parseInt(searchParams.get('page') || '1');

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

/**
 * 查询单个产品（by ID）
 * 直接透传到 WC REST API `/wp-json/wc/v3/products/<id>`
 */
async function handleSingleProduct(id: string) {
  try {
    const url = `${WC_API_URL}/${id}?${wcAuthParams()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Product not found (${res.status})` },
        { status: res.status === 404 ? 404 : 500 }
      );
    }
    const product = await res.json();
    return NextResponse.json(product, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[API /products/single] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
