import { NextRequest, NextResponse } from 'next/server';

// ★ v5.1: 服务端绝对 URL
const LOGIN_URL = 'https://api.gsmgc.es/wp-json/gsmgc/v1/login';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GSMGC-Next-Proxy/1.0',
        'Accept': 'application/json',
      },
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
