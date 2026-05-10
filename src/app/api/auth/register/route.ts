import { NextRequest, NextResponse } from 'next/server';

const REGISTER_API = 'https://api.gsmgc.es/wp-json/gsmgc/v1/register';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(REGISTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GSMGC-Next-Proxy/1.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    // ★ Content-Type guard — 防 CF challenge HTML 崩溃 res.json()
    const ct = (res.headers.get('Content-Type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const text = await res.text().catch(() => '');
      console.error('[API /auth/register] Non-JSON response:', res.status, ct, text.slice(0, 200));
      return NextResponse.json(
        { success: false, error: 'upstream_invalid_response', preview: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[API /auth/register] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Register proxy error', error: err.message },
      { status: 500 }
    );
  }
}
