// Next.js API Route — 代理到 WooCommerce REST API 获取分类
// 前端只做渲染，分类数据100%来自 WC 后端

import { NextRequest, NextResponse } from 'next/server';

const WC_API_URL = 'https://api.gsmgc.es/wp-json/wc/v3/products/categories';
const WC_KEY = process.env.WC_KEY!;
const WC_SECRET = process.env.WC_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const wcParams = new URLSearchParams();
    wcParams.set('consumer_key', WC_KEY);
    wcParams.set('consumer_secret', WC_SECRET);
    wcParams.set('per_page', searchParams.get('per_page') || '100');
    wcParams.set('page', searchParams.get('page') || '1');
    wcParams.set('hide_empty', 'true');

    const res = await fetch(`${WC_API_URL}?${wcParams.toString()}`, {
      headers: {
        'User-Agent': 'GSMGC-Next-Proxy/1.0',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[API /categories] WC REST API error:', res.status, text);
      return NextResponse.json(
        { success: false, error: `WC API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err: any) {
    console.error('[API /categories] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
