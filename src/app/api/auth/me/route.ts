/**
 * GET /api/auth/me
 *
 * 铁律：
 *   - /me 失败 ≠ 未登录（可能是网络抖动、CF 拦截等）
 *   - 只有 401 才算未登录
 *   - 其他错误返回 { logged_in: false } 但不清 token
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 透传 Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ logged_in: false });
  }

  try {
    // ★ 走 /api/proxy/，不直连 api.gsmgc.es
    const proxyHeaders: Record<string, string> = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next.js/1.0',
    };

    // ★ 透传 Cookie（WC 需要 cookie 来验证登录态）
    const cookieHeader = req.headers.get('Cookie');
    if (cookieHeader) proxyHeaders['Cookie'] = cookieHeader;

    const proxyUrl = `${req.nextUrl.origin}/api/proxy/wp-json/gsmgc/v1/me`;

    const res = await fetch(proxyUrl, {
      method: 'GET',
      headers: proxyHeaders,
      cache: 'no-store',
    });

    // 被CF拦截 → 返回 HTML → 不清 token，返回 false
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('text/html')) {
      console.warn('[api/auth/me] Got HTML response (CF blocked), returning false WITHOUT clearing token');
      return NextResponse.json({ logged_in: false, blocked: true });
    }

    // 只有 401 才是真正未登录
    if (res.status === 401) {
      console.log('[api/auth/me] 401 Unauthorized — token invalid');
      return NextResponse.json({ logged_in: false, unauthorized: true });
    }

    if (!res.ok) {
      console.warn('[api/auth/me] Non-OK response:', res.status, '— returning false WITHOUT clearing token');
      return NextResponse.json({ logged_in: false });
    }

    const data = await res.json();

    // 支持多种响应格式
    if (data.success && data.user && (data.user as Record<string, unknown>).id) {
      return NextResponse.json({ logged_in: true, user: data.user });
    }
    if (data.logged_in && data.user && (data.user as Record<string, unknown>).id) {
      return NextResponse.json({ logged_in: true, user: data.user });
    }
    if (data.id) {
      return NextResponse.json({ logged_in: true, user: data });
    }

    console.warn('[api/auth/me] No valid user in response:', JSON.stringify(data).substring(0, 200));
    return NextResponse.json({ logged_in: false });
  } catch (err) {
    // 网络错误 → 不清 token，返回 false
    console.warn('[api/auth/me] Network error:', (err as Error).message, '— returning false WITHOUT clearing token');
    return NextResponse.json({ logged_in: false });
  }
}
