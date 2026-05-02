// Next.js API Route — 代理到 WordPress 自定义端点 /categories-raw
// ★ 生产：走 /api/proxy/ | 开发：本地 fixture（绕过 SG CAPTCHA）

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// 开发模式：使用本地 fixture
function loadDevFixture(): any[] | null {
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    const raw = readFileSync(
      join(process.cwd(), 'fixtures', 'categories-raw.json'),
      'utf-8'
    );
    const json = JSON.parse(raw);
    if (json.success && Array.isArray(json.categories)) {
      console.log('[DEV FIXTURE] /categories loaded from fixture');
      return json.categories;
    }
  } catch (e) {
    console.warn('[DEV FIXTURE] Failed to load categories fixture:', (e as Error).message);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // ★ 开发模式：使用 fixture 数据
    const devData = loadDevFixture();
    if (devData) {
      return NextResponse.json(devData, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'GSMGC-Next-Server/1.0',
      'Accept': 'application/json',
    };
    const authHeader = request.headers.get('Authorization');
    if (authHeader) proxyHeaders['Authorization'] = authHeader;
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader;

    const proxyUrl = `${request.nextUrl.origin}/api/proxy/wp-json/gsmgc/v1/categories-raw`;

    const res = await fetch(proxyUrl, {
      headers: proxyHeaders,
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
