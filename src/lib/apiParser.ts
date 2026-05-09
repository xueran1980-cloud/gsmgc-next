/**
 * apiParser.ts
 *
 * API 响应解析层（Layer 2）
 *
 * 职责：
 *   - JSON.parse
 *   - 错误分类（HTTP status → 语义 reason）
 *   - 返回标准化 Result
 *
 * 输入：Response（来自 fetchWithFallback）
 * 输出：FetchResult<T>
 *
 * 不做什么：
 *   - 不发请求
 *   - 不做 fallback
 *   - 不做业务映射（logged_in / user model 等）
 */

export interface FetchResult<T = unknown> {
  ok: boolean;
  data?: T;
  reason?: 'unauthorized' | 'cf_blocked' | 'server_error' | 'network' | 'parse_error' | 'http_error';
  status?: number;
}

/**
 * 将 Response 解析为标准化 FetchResult
 *
 * 分类规则：
 *   - 401          → unauthorized（正常业务语义）
 *   - HTML 响应    → cf_blocked（CF 拦截）
 *   - 500-599      → server_error（WP 崩溃）
 *   - JSON 解析失败 → parse_error
 *   - 其他 4xx     → http_error
 *   - 2xx + JSON   → ok + data
 */
export async function parseApiResponse<T = unknown>(res: Response): Promise<FetchResult<T>> {
  // 401 → 业务语义，直接标记
  if (res.status === 401) {
    return { ok: false, reason: 'unauthorized', status: 401 };
  }

  // HTML → CF 拦截（两条路都失败了）
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('text/html')) {
    return { ok: false, reason: 'cf_blocked', status: res.status };
  }

  // 500+ → WP 崩溃
  if (res.status >= 500) {
    return { ok: false, reason: 'server_error', status: res.status };
  }

  // 其他 HTTP 错误（4xx 非 401）
  if (!res.ok) {
    return { ok: false, reason: 'http_error', status: res.status };
  }

  // JSON 解析
  try {
    const data: T = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'parse_error', status: res.status };
  }
}

/**
 * 包装 fetchWithFallback + parseApiResponse 的便捷函数
 * 用于需要"一步到位"的场景
 */
export async function fetchAndParse<T = unknown>(
  responsePromise: Promise<Response>
): Promise<FetchResult<T>> {
  try {
    const res = await responsePromise;
    return await parseApiResponse<T>(res);
  } catch (err) {
    // proxy 也失败（网络完全不可达）
    console.warn('[parseApiResponse] All paths failed:', (err as Error).message);
    return { ok: false, reason: 'network' };
  }
}
