/**
 * fetchWithFallback.ts
 *
 * 纯直连执行器：统一走 https://api.gsmgc.es
 * ★ 不再 fallback 到 /api/proxy/（CF 拦截 Vercel IP，proxy 不可靠）
 *
 * 职责：
 *   - 直连 api.gsmgc.es
 *   - 统一错误处理（HTML 检测、超时、日志）
 *   - 返回 Response
 *
 * 不做什么：
 *   - 不 JSON.parse
 *   - 不业务判断
 *   - 不返回 FetchResult
 */

const API_BASE = 'https://api.gsmgc.es';

/**
 * 判断响应是否不可信（纯技术，不涉及业务语义）
 */
function isResponseUnreliable(res: Response): boolean {
  const ct = res.headers.get('Content-Type') || '';
  const isHtml = ct.includes('text/html');
  const isServerError = res.status >= 500 && res.status < 600;
  const isCfHardBlock = res.status === 403 && isHtml;
  return isHtml || isServerError || isCfHardBlock;
}

/**
 * 服务端版本（用于 Next.js route.ts）
 *
 * @param apiPath - WP JSON API 路径，如 `/wp-json/gsmgc/v1/me`
 * @param options - fetch 选项
 * @returns Response
 */
export async function fetchWithFallbackServer(
  apiPath: string,
  options: RequestInit,
  _origin?: string  // 保留参数兼容性（不再使用，统一直连）
): Promise<Response> {
  const url = `${API_BASE}${apiPath}`;

  try {
    const res = await fetch(url, { ...options, cache: 'no-store' });
    if (isResponseUnreliable(res)) {
      console.error(`[fetch] Unreliable response: ${res.status} ${res.headers.get('Content-Type')}`);
      return new Response(
        JSON.stringify({ success: false, message: `Backend error: ${res.status}` }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return res;
  } catch (err) {
    console.error('[fetch] Network error:', (err as Error).message);
    return new Response(
      JSON.stringify({ success: false, message: 'Network error, please try again.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 客户端版本（用于 auth.ts / lib/api.ts）
 *
 * @param apiPath - WP JSON API 路径
 * @param options - fetch 选项
 * @param token - 可选 auth token（添加到 URL 参数）
 * @returns Response
 */
export async function fetchWithFallbackClient(
  apiPath: string,
  options: RequestInit,
  token?: string
): Promise<Response> {
  let url = `${API_BASE}${apiPath}`;

  // auth_token URL 兜底
  if (token && typeof window !== 'undefined' && !url.includes('auth_token=')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}auth_token=${encodeURIComponent(token)}`;
  }

  try {
    const res = await fetch(url, { ...options, cache: 'no-store' });
    if (isResponseUnreliable(res)) {
      console.error(`[fetch] Unreliable response: ${res.status} ${res.headers.get('Content-Type')}`);
      return new Response(
        JSON.stringify({ success: false, message: `Backend error: ${res.status}` }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return res;
  } catch (err) {
    console.error('[fetch] Network error:', (err as Error).message);
    return new Response(
      JSON.stringify({ success: false, message: 'Network error, please try again.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
