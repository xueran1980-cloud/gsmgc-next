/**
 * GET /api/orders
 * Proxy to WooCommerce my-orders endpoint (BYPASS CF Bot Fight Mode)
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };

    // ★ 透传 token + cookie
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const proxyUrl = `${request.nextUrl.origin}/api/proxy/wp-json/gsmgc/v1/my-orders`;
    const res = await fetch(proxyUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const ct = (res.headers.get('Content-Type') || '').toLowerCase();
    if (ct.includes('text/html')) {
      return NextResponse.json(
        { success: false, error: 'CF blocked' },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[API /orders] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
