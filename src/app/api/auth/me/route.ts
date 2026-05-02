/**
 * GET /api/auth/me
 *
 * ★ v5.2: 服务端直连 api.gsmgc.es（Vercel runtime 不被 CF Bot Fight Mode 拦截）
 *
 * 铁律：
 *   - /me 失败 ≠ 未登录（可能是网络抖动、CF 拦截等）
 *   - 只有 401 才算未登录
 *   - 其他错误返回 { logged_in: false } 但不清 token
 */
import { NextRequest, NextResponse } from 'next/server';

// ★ v5.2: 服务端直连（Vercel runtime 不被 CF 拦截）
const WP_API_ORIGIN = 'https://api.gsmgc.es/wp-json/gsmgc/v1';

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ logged_in: false });
  }

  try {
    const res = await fetch(`${WP_API_ORIGIN}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GSMGC-Next.js/1.0',
      },
      cache: 'no-store',
    });

    // ★ 被CF拦截 → 返回 HTML → 不清 token，返回 false
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('text/html')) {
      console.warn('[api/auth/me] Got HTML response (CF blocked), returning false WITHOUT clearing token');
      return NextResponse.json({ logged_in: false, blocked: true });
    }

    // ★ 只有 401 才是真正未登录
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
      return { logged_in: true, user: data.user } as any;
    }
    if (data.logged_in && data.user && (data.user as Record<string, unknown>).id) {
      return { logged_in: true, user: data.user } as any;
    }
    if (data.id) {
      return { logged_in: true, user: data } as any;
    }

    console.warn('[api/auth/me] No valid user in response:', JSON.stringify(data).substring(0, 200));
    return NextResponse.json({ logged_in: false });
  } catch (err) {
    // 网络错误 → 不清 token，返回 false
    console.warn('[api/auth/me] Network error:', (err as Error).message, '— returning false WITHOUT clearing token');
    return NextResponse.json({ logged_in: false });
  }
}
