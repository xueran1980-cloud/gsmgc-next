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
 * ★ v2: 所有请求走 Vercel proxy（/api/proxy/wp-json/...），避免直连 api.gsmgc.es
 *       被 CF Bot Fight Mode 拦截（202 sgcaptcha challenge）
 *       Vercel rewrite proxy 不会被 CF 拦截，因为请求来自 CF 自己的边缘节点
 */
import { NextRequest, NextResponse } from 'next/server';
import { GSMGC_API_DIRECT } from '@/config/api';

// ★ v2: 所有请求走 Vercel proxy，不走直连
// Vercel proxy 是 rewrite（/api/proxy/:path* → api.gsmgc.es/:path*），
// 由 CF 边缘节点处理，不会被 Bot Fight Mode 拦截
const PROXY_BASE = 'https://gsmgc-next.vercel.app/api/proxy';
const WP_API_DIRECT = `${GSMGC_API_DIRECT}`;
const WP_API_PROXY = `${PROXY_BASE}/wp-json/gsmgc/v1`;

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
 * 调用自定义 /me 端点（gsmgc/v1/me）
 * ★ v2: 优先走 Vercel proxy，fallback 到直连
 */
async function checkViaCustomAPI(token: string): Promise<{ logged_in: boolean; user?: Record<string, unknown> }> {
  // ★ 策略：先走 proxy（不会被 CF 拦截），失败再走直连
  const endpoints = [
    `${WP_API_PROXY}/me`,   // Vercel proxy（优先）
    `${GSMGC_API_DIRECT}/me`, // 直连（fallback）
  ];

  for (const url of endpoints) {
    try {
      console.log('[api/auth/me] Trying:', url.includes('proxy') ? 'PROXY' : 'DIRECT');
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'GSMGC-Next.js/1.0',
        },
        cache: 'no-store',
      });

      // 检查是否被 CF/SG 拦截（返回 HTML 而不是 JSON）
      const ct = res.headers.get('Content-Type') || '';
      if (ct.includes('text/html')) {
        console.warn('[api/auth/me] Got HTML response (blocked), trying next endpoint');
        continue; // 被拦截，尝试下一个
      }

      if (!res.ok) {
        console.warn('[api/auth/me] Non-OK response:', res.status, 'from', url.includes('proxy') ? 'PROXY' : 'DIRECT');
        continue;
      }

      const data = await res.json();
      console.log('[api/auth/me] Response data:', JSON.stringify(data).substring(0, 300));

      // gsmgc-auth.php 返回格式: { success: true, user: {...} } 或 { logged_in: true, user: {...} }
      if (data.success && data.user && (data.user as Record<string, unknown>).id) {
        return { logged_in: true, user: data.user as Record<string, unknown> };
      }
      if (data.logged_in && data.user && (data.user as Record<string, unknown>).id) {
        return { logged_in: true, user: data.user as Record<string, unknown> };
      }
      if (data.id) {
        return { logged_in: true, user: data as unknown as Record<string, unknown> };
      }

      console.warn('[api/auth/me] No valid user in response:', JSON.stringify(data).substring(0, 200));
      return { logged_in: false };
    } catch (err) {
      console.warn('[api/auth/me] Check failed for', url.includes('proxy') ? 'PROXY' : 'DIRECT', ':', (err as Error).message);
      continue; // 继续尝试下一个
    }
  }

  return { logged_in: false };
}

export async function GET(req: NextRequest) {
  // 方式 1：Bearer token（自定义 token，最可靠）
  const token = getBearerToken(req);
  if (token) {
    const result = await checkViaCustomAPI(token);
    if (result.logged_in) {
      return NextResponse.json(result);
    }
  }

  // 均未通过
  return NextResponse.json({ logged_in: false });
}
