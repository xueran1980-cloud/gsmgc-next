/**
 * GET /api/orders
 * 直连 WooCommerce my-orders 端点（不走 Vercel proxy，避免 CF challenge）
 */
import { NextRequest, NextResponse } from 'next/server';

const MY_ORDERS_API = 'https://api.gsmgc.es/wp-json/gsmgc/v1/my-orders';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };

    // ★ 透传 token
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const res = await fetch(MY_ORDERS_API, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    // ★ Content-Type guard — 防 CF challenge HTML
    const ct = (res.headers.get('Content-Type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const text = await res.text().catch(() => '');
      console.error('[API /orders] Non-JSON response:', res.status, ct, text.slice(0, 200));
      return NextResponse.json(
        { success: false, error: 'CF blocked or upstream invalid', preview: text.slice(0, 200) },
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
