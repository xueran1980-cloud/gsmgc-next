/**
 * GET /api/auth/me
 *
 * 统一登录状态端点（SSR/客户端均可调用）
 *
 * 认证方式（按优先级）：
 *   1. Authorization: Bearer <gsmgc_auth_token>  — 自定义 token（主方式）
 *   2. wordpress_logged_in cookie               — WP 登录 cookie（需同域或被代理转发）
 *
 * 返回格式（统一）：
 *   { logged_in: true, user: {...} }
 *   { logged_in: false }
 *
 * 部署注意：
 *   - Vercel 上此路由运行在 Node.js 环境，可发起服务端 fetch 到 api.gsmgc.es
 *   - 若浏览器未发送 cookie，仅 Bearer token 方式可用
 *   - wordpress_logged_in cookie 仅在同一个域名下才会被浏览器发送
 */
import { NextRequest, NextResponse } from 'next/server';
import { GSMGC_API_DIRECT } from '@/config/api';

const WP_API_BASE = `${GSMGC_API_DIRECT}/wp-json`;

/**
 * 从请求中解析 Bearer token
 */
function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

/**
 * 从请求 cookie 中读取指定 cookie 值
 */
function getCookie(req: NextRequest, name: string): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * 调用自定义 /me 端点（gsmgc/v1/me）
 * 此端点接受 Bearer token，返回 { user: {...} }
 */
async function checkViaCustomAPI(token: string): Promise<{ logged_in: boolean; user?: Record<string, unknown> }> {
  try {
    const url = `${GSMGC_API_DIRECT}/wp-json/gsmgc/v1/me`;
    console.log('[api/auth/me] Checking via custom API:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GSMGC-Next.js/1.0',
      },
      cache: 'no-store',
    });

    console.log('[api/auth/me] Response status:', res.status);
    console.log('[api/auth/me] Response headers:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const text = await res.text();
      console.warn('[api/auth/me] Non-OK response:', text.substring(0, 200));
      return { logged_in: false };
    }

    const data = await res.json();
    console.log('[api/auth/me] Response data:', JSON.stringify(data).substring(0, 200));
    
    if (data.logged_in && data.user && (data.user as Record<string, unknown>).id) {
      return { logged_in: true, user: data.user as Record<string, unknown> };
    }
    if (data.id) {
      return { logged_in: true, user: data as unknown as Record<string, unknown> };
    }
    return { logged_in: false };
  } catch (err) {
    console.warn('[api/auth/me] Custom API check failed:', (err as Error).message);
    return { logged_in: false };
  }
}

/**
 * 调用 WP REST API /wp/v2/users/me
 * 需要 wordpress_logged_in cookie（服务端请求可附带）
 */
async function checkViaWPCookie(req: NextRequest): Promise<{ logged_in: boolean; user?: Record<string, unknown> }> {
  try {
    const wpCookie = getCookie(req, 'wordpress_logged_in_gsmgc');
    // wordpress_logged_in 的完整 cookie 名需与 WP 配置匹配
    // 常见格式：wordpress_logged_in_<hash_suffix>
    // 此处转发所有 wordpress 开头的 cookie
    const allCookies = req.headers.get('cookie') || '';

    const res = await fetch(`${WP_API_BASE}/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Cookie': allCookies,
        'Content-Type': 'application/json',
        'User-Agent': 'GSMGC-Next.js/1.0',
      },
      cache: 'no-store',
    });

    if (!res.ok) return { logged_in: false };

    const user = await res.json();
    if (user && user.id) {
      return { logged_in: true, user: user as unknown as Record<string, unknown> };
    }
    return { logged_in: false };
  } catch (err) {
    console.warn('[api/auth/me] WP cookie check failed:', (err as Error).message);
    return { logged_in: false };
  }
}

export async function GET(req: NextRequest) {
  // 方式 1：Bearer token（自定义 token，最可靠）
  const token = getBearerToken(req);
  if (token) {
    const result = await checkViaCustomAPI(token);
    if (result.logged_in) {
      return NextResponse.json(result);
    }
    // token 无效，尝试 cookie 方式
  }

  // 方式 2：WP cookie（需浏览器同域发送 cookie）
  const cookieCheck = await checkViaWPCookie(req);
  if (cookieCheck.logged_in) {
    return NextResponse.json(cookieCheck);
  }

  // 均未通过
  return NextResponse.json({ logged_in: false });
}
