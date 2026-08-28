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
 * @param token - 可选 auth token（★ P1-1: 改走 Authorization: Bearer header，不再放 URL query）
 * @returns Response
 */
export async function fetchWithFallbackClient(
  apiPath: string,
  options: RequestInit,
  token?: string
): Promise<Response> {
  const url = `${API_BASE}${apiPath}`;

  // ★ P1-1 (2026-08-28): token 改走 Authorization: Bearer header —— 不再追加 ?auth_token= 到 URL
  //   原因：URL token 被 SG access log 明文记录（Full-Site Audit P1-1，Confirmed，实测 982 次/天）
  //   兼容：后端 _gsmgc_get_bearer_token() 阶段 1 仍保留 $_GET['auth_token'] fallback（Phase 2 观察 7 天后另行审批）
  //   已实证：OPTIONS preflight 204 + allow-headers 含 Authorization；GET /me + Bearer 穿透 CF 达后端（401 JSON）
  const headers = new Headers(options.headers);
  if (token && typeof window !== 'undefined' && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, { ...options, headers, cache: 'no-store' });
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
