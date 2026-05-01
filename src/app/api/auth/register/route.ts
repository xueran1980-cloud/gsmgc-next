import { NextRequest, NextResponse } from 'next/server';

const REGISTER_URL = 'https://api.gsmgc.es/wp-json/gsmgc/v1/register';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(REGISTER_URL, {
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
    console.error('[API /auth/register] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Register proxy error', error: err.message },
      { status: 500 }
    );
  }
}
