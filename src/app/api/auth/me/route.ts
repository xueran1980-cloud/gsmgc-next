/**
 * GET /api/auth/me
 *
 * Layer 3：纯业务映射
 *
 * 三层分离：
 *   fetchWithFallbackServer → Response（纯执行器）
 *   parseApiResponse       → FetchResult（解析层）
 *   route.ts               → 业务映射（这里）
 *
 * 铁律：
 *   - /me 失败 ≠ 未登录
 *   - 只有 401 才算未登录
 *   - 其他错误返回 { logged_in: false } 但不清 token
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbackServer } from '@/lib/fetchWithFallback';
import { parseApiResponse, type FetchResult } from '@/lib/apiParser';

interface MeUser {
  id: number;
  display_name?: string;
  user_email?: string;
  [key: string]: unknown;
}

interface MeResponse {
  success?: boolean;
  logged_in?: boolean;
  user?: MeUser;
  id?: number;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ logged_in: false });
  }

  // 构造请求头
  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'User-Agent': 'GSMGC-Next.js/1.0',
  };
  const cookieHeader = req.headers.get('Cookie');
  if (cookieHeader) headers['Cookie'] = cookieHeader;

  // Layer 1: 纯执行器 → Response
  const res = await fetchWithFallbackServer(
    '/wp-json/gsmgc/v1/me',
    { method: 'GET', headers, cache: 'no-store' },
    req.nextUrl.origin
  );

  // Layer 2: 解析层 → FetchResult
  const result: FetchResult<MeResponse> = await parseApiResponse<MeResponse>(res);

  // Layer 3: 纯业务映射
  return mapMeResult(result);
}

/**
 * 业务映射：FetchResult → NextResponse
 * 只关心业务语义，不接触 HTTP
 */
function mapMeResult(result: FetchResult<MeResponse>): NextResponse {
  if (result.ok && result.data) {
    const user = extractUser(result.data);
    if (user) {
      return NextResponse.json({ logged_in: true, user });
    }
    console.warn('[api/auth/me] No valid user in response');
    return NextResponse.json({ logged_in: false });
  }

  switch (result.reason) {
    case 'unauthorized':
      console.debug('[api/auth/me] 401 — token invalid');
      return NextResponse.json({ logged_in: false, unauthorized: true });

    case 'cf_blocked':
      console.warn('[api/auth/me] CF blocked (both paths), returning false WITHOUT clearing token');
      return NextResponse.json({ logged_in: false, blocked: true });

    case 'server_error':
      console.warn('[api/auth/me] WP server error (both paths), returning false WITHOUT clearing token');
      return NextResponse.json({ logged_in: false });

    case 'network':
      console.warn('[api/auth/me] Network unreachable (both paths), returning false WITHOUT clearing token');
      return NextResponse.json({ logged_in: false });

    default:
      console.warn('[api/auth/me] Error:', result.reason, result.status);
      return NextResponse.json({ logged_in: false });
  }
}

/**
 * 从多种 WP 响应格式中提取用户
 */
function extractUser(data: MeResponse): MeUser | null {
  if (data.success && data.user && data.user.id) return data.user;
  if (data.logged_in && data.user && data.user.id) return data.user;
  if (data.id) return data as unknown as MeUser;
  return null;
}
