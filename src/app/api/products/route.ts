// Next.js API Route — 代理到 WordPress 自定义端点 /products-raw
// ★ 生产：直连 api.gsmgc.es | 开发：本地 fixture
// ★ FINAL MAPPING CONTRACT: 所有数据解释逻辑来自 applyMapping()
// ★ CACHE: L1 内存 + L2 Next.js fetch cache (revalidate=60s)

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyMapping } from '@/lib/display-formatter';

// ── L1 Memory Cache ──
let cacheProducts: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60秒

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
    const orderby = searchParams.get('orderby') || 'price'; // ★ 默认：price-desc（对齐旧站）
    const order = searchParams.get('order') || 'desc';

    // ★ 数据源
    let products: any[];

    const devData = loadDevFixture();
    if (devData) {
      products = devData;
    } else {
      // ★ L1 Memory Cache: 60秒内直接返回，避免重复请求 origin
      if (cacheProducts && (Date.now() - cacheTime) < CACHE_TTL) {
        products = cacheProducts;
      } else {
        // ★ L2: Next.js fetch cache + 直连 api.gsmgc.es（避免 proxy 额外跳转）
        const apiUrl = 'https://api.gsmgc.es/wp-json/gsmgc/v1/products-raw';
        const res = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'GSMGC-Next-Server/1.0',
            'Accept': 'application/json',
          },
          next: { revalidate: 60 }, // L2 Edge Cache: 60秒
        });

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

        cacheProducts = json.products;
        cacheTime = Date.now();
        products = cacheProducts;
      }
    }

    // ★ FINAL MAPPING CONTRACT — 唯一数据解释入口
    const result = applyMapping({ products, category, search, page, perPage, orderby, order });

    if (category) console.log(`[FILTER] "${category}" → ${result.totalCount} products`);
    if (search) console.log(`[SEARCH] "${search}" → ${result.totalCount} results`);

    return NextResponse.json(
      {
        success: true,
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
