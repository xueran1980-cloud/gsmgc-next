// Next.js API Route — 代理到新分页端点 /products-paginated
// ★ 生产：直连 api.gsmgc.es | 开发：本地 fixture
// ★ 后端已完成筛选/排序/分页 → 前端只做代理 + 字段映射
// ★ 与 /api/products 完全独立 → 不影响现站

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// 开发模式：使用本地 fixture
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
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '24';
    const orderby = searchParams.get('orderby') || 'price';
    const order = searchParams.get('order') || 'desc';

    // ── 开发模式 ──
    const devData = loadDevFixture();
    if (devData) {
      // 开发模式：后端不支持分页，模拟分页行为
      const pageNum = parseInt(page);
      const perPageNum = parseInt(perPage);
      const start = (pageNum - 1) * perPageNum;
      const paged = devData.slice(start, start + perPageNum);
      return NextResponse.json({
        success: true,
        products: paged,
        totalCount: devData.length,
        totalPages: Math.ceil(devData.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      });
    }

    // ── 生产：直连新分页端点 ──
    const backendParams = new URLSearchParams();
    if (category) backendParams.set('category', category);
    if (search) backendParams.set('search', search);
    backendParams.set('page', page);
    backendParams.set('per_page', perPage);
    backendParams.set('orderby', orderby);
    backendParams.set('order', order);

    const backEndUrl = `https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?${backendParams.toString()}`;

    const res = await fetch(backEndUrl, {
      headers: {
        'User-Agent': 'GSMGC-Next-Server/1.0',
        'Accept': 'application/json',
      },
      // ★ 无 cache 配置 → 依赖后端 CDN-Cache-Control: max-age=120
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

    // ★ 字段映射：后端 snake_case → 前端 camelCase
    return NextResponse.json(
      {
        success: true,
        products: json.products,
        totalCount: json.total,
        totalPages: json.total_pages,
        page: json.page,
        perPage: json.per_page,
      },
      {
        headers: {
          // ★ no-store on Next.js side — 数据新鲜度由后端 CDN-Cache-Control 控制
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /products-v2] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
