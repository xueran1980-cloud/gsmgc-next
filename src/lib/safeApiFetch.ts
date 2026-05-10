/**
 * safeApiFetch.ts
 *
 * 统一 API 请求封装：
 *   - 统一直连 api.gsmgc.es（不再走 /api/proxy/）
 *   - timeout（10s）
 *   - HTML 检测（CF challenge / 500 页面）
 *   - CF 检测（403 + HTML）
 *   - JSON parse 安全处理
 *   - 统一日志
 *   - 强制 no-store
 *
 * 使用方式：
 *   const data = await safeApiFetch('/wp-json/gsmgc/v1/...', options);
 *   // data 已经是解析后的 JSON 对象，或抛出明确错误
 */

const API_BASE = 'https://api.gsmgc.es';
const TIMEOUT_MS = 10000;

/**
 * 判断响应是否是 HTML（CF challenge 或错误页面）
 */
function isHtmlResponse(res: Response): boolean {
  const ct = res.headers.get('Content-Type') || '';
  return ct.includes('text/html');
}

/**
 * 判断是否是 CF 拦截
 */
function isCfBlock(res: Response): boolean {
  return res.status === 403 && isHtmlResponse(res);
}

/**
 * 安全 fetch：统一处理所有 API 请求
 *
 * @param apiPath - API 路径，如 `/wp-json/gsmgc/v1/products-raw`
 * @param options - fetch 选项（可选）
 * @param token - 可选 auth token（添加到 URL 参数）
 * @returns 解析后的 JSON 对象
 * @throws 明确错误信息（含 HTTP 状态码）
 */
export async function safeApiFetch<T = any>(
  apiPath: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  let url = `${API_BASE}${apiPath}`;

  // auth_token URL 兜底（客户端）
  if (token && typeof window !== 'undefined' && !url.includes('auth_token=')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}auth_token=${encodeURIComponent(token)}`;
  }

  // 超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GSMGC-Next.js/1.0',
        ...options.headers,
      },
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);

    // HTML 检测（CF challenge / 500 页面）
    if (isHtmlResponse(res)) {
      const snippet = await res.text().then(t => t.slice(0, 200));
      console.error(`[safeApiFetch] HTML response (${res.status}):`, snippet);
      throw new Error(`Backend returned HTML instead of JSON (HTTP ${res.status})`);
    }

    // CF 拦截检测
    if (isCfBlock(res)) {
      console.error('[safeApiFetch] CF Block:', url);
      throw new Error('Request blocked by Cloudflare. Please try again later.');
    }

    // HTTP 错误状态
    if (!res.ok) {
      const text = await res.text().then(t => t.slice(0, 200));
      console.error(`[safeApiFetch] HTTP ${res.status}:`, text);
      throw new Error(`Backend error: HTTP ${res.status}`);
    }

    // JSON parse
    const data = await res.json();
    return data as T;

  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }

    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your connection.');
    }

    throw err;
  }
}
