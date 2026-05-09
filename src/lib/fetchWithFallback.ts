/**
 * fetchWithFallback.ts
 *
 * 纯执行器：保证拿到一个 Response（不管好坏）
 *
 * 职责（唯一）：
 *   - 先直连 api.gsmgc.es
 *   - 响应不可信（HTML/500/网络错误）→ fallback /api/proxy/
 *   - 返回最终 Response
 *
 * 不做什么：
 *   - 不 JSON.parse
 *   - 不错误分类
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
 * @param origin - Vercel deployment origin
 * @returns Response — 可能是直连的，也可能是 proxy 的
 */
export async function fetchWithFallbackServer(
  apiPath: string,
  options: RequestInit,
  origin: string
): Promise<Response> {
  const directUrl = `${API_BASE}${apiPath}`;
  const proxyUrl = `${origin}/api/proxy${apiPath}`;

  let res: Response;
  let usedProxy = false;

  try {
    res = await fetch(directUrl, { ...options, cache: 'no-store' });
  } catch (err) {
    console.warn('[fetch] Direct network error, fallback:', (err as Error).message);
    res = await fetch(proxyUrl, options);
    usedProxy = true;
  }

  if (!usedProxy && isResponseUnreliable(res)) {
    console.warn(`[fetch] Direct unreliable (status=${res.status}), fallback`);
    res = await fetch(proxyUrl, options);
  }

  return res;
}

/**
 * 客户端版本（用于 auth.ts / lib/api.ts）
 *
 * @param apiPath - WP JSON API 路径
 * @param options - fetch 选项
 * @returns Response
 */
export async function fetchWithFallbackClient(
  apiPath: string,
  options: RequestInit,
  token?: string
): Promise<Response> {
  // ★ apiPath 可能是完整 URL（直连模式）或路径（proxy 模式）
  const isFulUrl = apiPath.startsWith('http');
  let directUrl = apiPath;
  const proxyUrl = isFulUrl 
    ? `/api/proxy/${apiPath.replace('https://api.gsmgc.es', '')}`
    : `/api/proxy${apiPath}`;

  // auth_token URL 兜底（Layer 1 职责：确保请求能可靠到达后端）
  if (token && typeof window !== 'undefined' && !directUrl.includes('auth_token=')) {
    const sep = directUrl.includes('?') ? '&' : '?';
    directUrl = `${directUrl}${sep}auth_token=${encodeURIComponent(token)}`;
  }

  let res: Response;
  let usedProxy = false;

  try {
    res = await fetch(directUrl, { ...options, cache: 'no-store' });
  } catch (err) {
    console.warn('[fetch] Direct network error, fallback:', (err as Error).message);
    res = await fetch(proxyUrl, options);
    usedProxy = true;
  }

  if (!usedProxy && isResponseUnreliable(res)) {
    console.warn(`[fetch] Direct unreliable (status=${res.status}), fallback`);
    res = await fetch(proxyUrl, options);
  }

  return res;
}
