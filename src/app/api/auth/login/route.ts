import { NextRequest, NextResponse } from 'next/server';

const LOGIN_API = 'https://api.gsmgc.es/wp-json/gsmgc/v1/login';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(LOGIN_API, {
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
      console.error('[API /auth/login] Non-JSON response:', res.status, ct, text.slice(0, 200));
      return NextResponse.json(
        { success: false, error: 'upstream_invalid_response', preview: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await res.json();

    // ★ DoD B（2026-08-27）：登录成功 → 服务端 set httpOnly cookie（Host-only，不设 Domain）
    //   仅用于 Next SSR（/tienda）读身份；客户端 api.gsmgc.es 仍走 localStorage Bearer（迁移期双存储，P2b 退出）
    //   属性：HttpOnly + Secure + SameSite=Lax + Path=/ + Max-Age=7d（Host-only 减少凭证暴露范围）
    const token = data?.auth_token ?? null;
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (token) {
      headers['Set-Cookie'] =
        `gsmgc_auth=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
    }

    return NextResponse.json(data, {
      status: res.status,
      headers,
    });
  } catch (err: any) {
    console.error('[API /auth/login] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Login proxy error', error: err.message },
      { status: 500 }
    );
  }
}
