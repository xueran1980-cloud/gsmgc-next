// Next.js API Route — 代理到 WordPress 自定义端点 /products-raw
// ★ 生产：走 /api/proxy/ | 开发：本地 fixture
// ★ FINAL MAPPING CONTRACT: 所有数据解释逻辑来自 applyMapping()

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyMapping } from '@/lib/display-formatter';

// 开发模式：使用本地 fixture（绕过 SG CAPTCHA）
function loadDevFixture(): any[] | null {
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    const raw = readFileSync(join(process.cwd(), 'fixtures', 'products-raw.json'), 'utf-8');
    const json = JSON.parse(raw);
    if (json.success && Array.isArray(json.products)) return json.products;
  } catch (e) {
    console.warn('[DEV FIXTURE] Failed:', (e as Error).message);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '24');

    // ★ 数据源
    let products: any[];

    const devData = loadDevFixture();
    if (devData) {
      products = devData;
    } else {
      // 生产：走代理
      const proxyHeaders: Record<string, string> = {
        'User-Agent': 'GSMGC-Next-Server/1.0',
        'Accept': 'application/json',
      };
      const authHeader = request.headers.get('Authorization');
      if (authHeader) proxyHeaders['Authorization'] = authHeader;
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader;

      const proxyUrl = `${request.nextUrl.origin}/api/proxy/wp-json/gsmgc/v1/products-raw`;
      const res = await fetch(proxyUrl, { headers: proxyHeaders, cache: 'no-store' });

      if (!res.ok) {
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
      products = json.products;
    }

    // ★ FINAL MAPPING CONTRACT — 唯一数据解释入口
    const result = applyMapping({ products, category, search, page, perPage });

    if (category) console.log(`[FILTER] "${category}" → ${result.totalCount} products`);
    if (search) console.log(`[SEARCH] "${search}" → ${result.totalCount} results`);

    return NextResponse.json(
      {
        products: result.products,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        page: result.page,
        perPage: result.perPage,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[API /products] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
