import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ★ 走 /api/proxy/，不直连 api.gsmgc.es
    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next-Proxy/1.0',
      'Accept': 'application/json',
    };

    // ★ 透传 Cookie（如果需要）
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader;

    const res = await fetch('/api/proxy/wp-json/gsmgc/v1/login', {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[API /auth/login] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Login proxy error', error: err.message },
      { status: 500 }
    );
  }
}
