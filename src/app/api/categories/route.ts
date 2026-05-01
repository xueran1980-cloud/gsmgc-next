// Next.js API Route — 代理到 WordPress 自定义端点 /categories-raw
// 数据最终来源仍是 WooCommerce（由 mu-plugins 内部调用 WC REST API）
// 前端只做渲染，分类数据100%来自 WC 后端

import { NextRequest, NextResponse } from 'next/server';

const PROXY_BASE = '/api/proxy/wp-json/gsmgc/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 调用 WordPress /categories-raw 端点
    const res = await fetch(`${request.nextUrl.origin}/api/proxy/wp-json/gsmgc/v1/categories-raw`, {
      headers: {
        'User-Agent': 'GSMGC-Next-Proxy/1.0',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[API /categories] /categories-raw error:', res.status, text.slice(0, 200));
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.categories)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from backend' },
        { status: 502 }
      );
    }

    return NextResponse.json(json.categories, {
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
