/**
 * POST /api/orders/create
 * Proxy to WooCommerce create-order endpoint (BYPASS CF Bot Fight Mode)
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };

    // ★ 透传 Authorization token
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    // ★ 透传 Cookie
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    // Server-side: direct fetch to api.gsmgc.es (bypass Vercel edge proxy for POST)
    const res = await fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const ct = (res.headers.get('Content-Type') || '').toLowerCase();

    // CF blocked → HTML → 502
    if (ct.includes('text/html')) {
      return NextResponse.json(
        { success: false, message: 'Servidor temporalmente no disponible (CF)' },
        { status: 502 }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[API /orders/create] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Order proxy error', error: err.message },
      { status: 500 }
    );
  }
}
