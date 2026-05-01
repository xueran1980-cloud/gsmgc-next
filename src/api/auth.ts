// GSMGC Authentication API
//
// ★ 架构说明：
//   api.gsmgc.es 的 SG Bot Protection 已关闭，不再需要 iframe 预热
//   所有 API fetch 直接走 CORS 跨域请求（或 Vercel rewrite 代理 fallback）
//
//   策略：
//   1. 已登录用户：smartFetch 带 Bearer token → 直接跨域 fetch
//   2. 未登录用户：smartFetch 不带 token → 直接跨域 fetch
//   3. 写操作：走 Vercel rewrite 同源代理

import { API_BASE, GSMGC_API_DIRECT, GSMGC_API_PROXY } from '../config/api';

// ★ v4.5: SG Bot Protection 已关闭，warmup 不再需要
// 保留函数导出避免调用报错
let warmupResolved = true;
let warmupPromise: null = null;
let warmupConfirmed = true;

/**
 * 预热 SG Captcha（已禁用）
 * SG Bot Protection 已关闭，iframe 预热不再需要
 */
export function warmupSGCaptcha(): Promise<void> {
  return Promise.resolve();
}

// ★ v4.5: SG Bot Protection 已关闭，warmup 代码已移除

/**
 * ★ v6.0: 全局唯一清除函数
 * 所有异常路径必须走这里 — 确保 token/user/状态 全部归零
 * AuthContext 初始化时通过 onAuthClear() 注册回调来同步 React state
 */
let _onClearCallback: (() => void) | null = null;

export function clearAllAuth(): void {
  if (typeof window === 'undefined') return;
  console.warn('[GSMGC] clearAllAuth: clearing all auth state');
  setAuthToken(null);         // 清 token + USER_KEY (localStorage)
  // ★ v4.5: warmupConfirmed 不再需要重置（SG Bot Protection 已关闭）
  if (_onClearCallback) _onClearCallback();
}

// 注册清除回调（AuthContext 初始化时调用）
export function onAuthClear(cb: () => void): void {
  _onClearCallback = cb;
}

/**
 * Token 管理（v3.0: 替代 cookie 的跨域认证方式）
 * ★ v8.0: sessionStorage → localStorage — 持久登录，关标签页/关浏览器不丢
 */
const TOKEN_KEY = 'gsmgc_auth_token';
const USER_KEY  = 'gsmgc_auth_user'; // ★ v3.1: 同时保存 user 对象到本地，避免初始化时闪烁

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY); // 清除 token 时同步清除 user
    }
  } catch {}
}

/**
 * ★ v3.1: 本地 user 缓存
 * ★ v8.0: 改为 localStorage — 持久登录，刷新/关闭浏览器不丢
 * AuthContext 初始化时可立即恢复 UI 状态，避免"未登录"闪烁
 */
export interface GsmgcUser {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  cifNif?: string;
  account_status?: string;
  isPending?: boolean;
  [key: string]: unknown;
}

export function getCachedUser(): GsmgcUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    // ★ 防御性校验：确保 user 对象有效且有 id
    if (user && typeof user === 'object' && user.id) return user;
    // 数据无效，清除
    localStorage.removeItem(USER_KEY);
    return null;
  } catch {
    try { localStorage.removeItem(USER_KEY); } catch {}
    return null;
  }
}

export function setCachedUser(user: GsmgcUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user && user.id) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

/**
 * 智能请求：V4.4 — 三级路由策略
 *
 * ★ v4.0: GET → Edge Proxy
 * ★ v4.3: POST → Direct CORS + SGCaptcha warmup
 * ★ v4.4: POST → Direct CORS → Vercel Rewrite (307) fallback → Edge Proxy last resort
 *
 * 核心问题：SG Captcha 对 POST/OPTIONS 的拦截策略比 GET 更严格。
 * 即使有 _I_ cookie，OPTIONS preflight 可能仍返回 202/403。
 */
export async function smartFetch(path: string, options: RequestInit & { skip401?: boolean } = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  // ★ v6.1: skip401 选项 — logout 等场景不需要 401 熔断
  const { skip401 = false, ...fetchOptions } = options;

  // ★ v3.0: 自动附加 Bearer token（header 方式）
  const token = getAuthToken();
  const headers: Record<string, string> = { ...(fetchOptions.headers as Record<string, string> || {}) };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ★ v3.2: Token 仅通过 Authorization Bearer header 传递
  const finalPath = path;

  let res: Response;
  // ★ v4.4 核心策略：按方法分路由
  if (method === 'GET' || method === 'HEAD') {
    res = await fetchViaEdgeProxy(finalPath, headers, fetchOptions);
  } else {
    res = await fetchPOST(finalPath, token, headers, fetchOptions);
  }

  // ★ v6.1: 全局 401 熔断 — 任何 API 返回 401 → 清除状态 + throw 阻断执行流
  //    覆盖场景：token 过期 / token 被后端吊销 / 用户在别处登录
  //    不 reload：让调用方（AuthContext/CheckoutPage）决定如何处理 UI
  if (res.status === 401 && !skip401) {
    console.warn('[GSMGC] smartFetch: received 401, clearing auth + throwing');
    clearAllAuth();
    throw new Error('AUTH_EXPIRED');
  }

  return res;
}

/**
 * POST 请求多级 fallback 策略
 * Level 1: Direct CORS（浏览器有 _I cookie 时最快）
 * Level 2: Vercel Rewrite 307（重定向到源站，浏览器带目标域 cookie）
 * Level 3: Edge Proxy（最后手段，可能被 SG 拦截）
 */
async function fetchPOST(path: string, token: string | null, headers: Record<string, string>, options: RequestInit): Promise<Response> {
  // ★ v4.5: 不再需要 warmup（SG Bot Protection 已关闭）

  const directUrl = `${GSMGC_API_DIRECT}${path}`;

  // ── Level 1: Direct CORS ──
  try {
    const res = await fetch(directUrl, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
    });

    // 检查是否真的成功（不是 SG 拦截页）
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('json') && res.status >= 200 && res.status < 400) {
      return res;
    }

    // HTML 响应 = 被 SG 拦截
    if (ct.includes('text/html')) {
      console.warn('[GSMGC] Direct CORS got HTML, trying next level...');
      throw new Error('SG_BLOCKED_CORS');
    }

    // 其他 JSON 错误响应也返回给调用者处理
    return res;
  } catch (err) {
    console.warn('[GSMGC] Direct CORS failed:', (err as Error).message);
  }

  // ── Level 2: Vercel Rewrite (307 redirect to source) ──
  try {
    const rewriteUrl = `${GSMGC_API_PROXY}${path}`;
    const res = await fetch(rewriteUrl, {
      ...options,
      method: options.method || 'POST',
      headers,
      credentials: 'same-origin',
    });

    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('json') || ct.includes('text/html') === false || !ct) {
      return res;
    }
    console.warn('[GSMGC] Vercel Rewrite got non-JSON, checking body...');

    // 307 重定向后如果还是 HTML，可能被 SG 拦截了
    const text = await res.text().catch(() => '');
    if (text.includes('sgcaptcha') || text.includes('challenge')) {
      throw new Error('SG_BLOCKED_REWRITE');
    }
    return new Response(text, { status: res.status, headers: res.headers });
  } catch (err) {
    console.warn('[GSMGC] Vercel Rewrite failed:', (err as Error).message);
  }

  // Level 3: Edge Proxy (last resort - may be blocked by SG for POSTs)
  return fetchViaEdgeProxy(path, headers, options);
}

/**
 * Edge Proxy 路由：用于 GET/HEAD 请求
 * Vercel Edge Function 服务端转发，完全绕过浏览器 CORS
 */
async function fetchViaEdgeProxy(path: string, headers: Record<string, string>, options: RequestInit): Promise<Response> {
  const PROXY_BASE = '/api/proxy/wp-json/gsmgc/v1';
  // ★ v7.1: 对认证端点加 cache-busting，绕过 SiteGround NGINX Dynamic Cache
  //    NGINX 缓存了 /me 响应导致不同用户看到上一个用户的登录态
  const noCachePaths = ['/me', '/auth-check'];
  const needsBust = noCachePaths.some(p => path.startsWith(p));
  const separator = path.includes('?') ? '&' : '?';
  const bustPath = needsBust ? `${path}${separator}_t=${Date.now()}` : path;
  const proxyUrl = `${PROXY_BASE}${bustPath}`;

  try {
    const res = await fetch(proxyUrl, {
      ...options,
      method: options.method || 'GET',
      headers,
      credentials: 'same-origin',
    });

    if (res.status === 502 || res.status === 403) {
      const text = await res.text().catch(() => '');
      console.warn('[GSMGC] Edge Proxy error:', res.status, text.substring(0, 100));
      // Fallback to direct for GET too
      return attemptDirectFetch(path, getAuthToken(), headers, options);
    }

    return res;
  } catch (err) {
    console.warn('[GSMGC] Edge Proxy failed:', (err as Error).message);
    return attemptDirectFetch(path, getAuthToken(), headers, options);
  }
}

/**
 * Fallback: 直接跨域请求 api.gsmgc.es（需要 SGCaptcha warmup 成功）
 */
async function attemptDirectFetch(path: string, token: string | null, headers: Record<string, string>, options: RequestInit): Promise<Response> {
  // ★ v7.1: 对认证端点加 cache-busting（同 fetchViaEdgeProxy）
  const noCachePaths = ['/me', '/auth-check'];
  const needsBust = noCachePaths.some(p => path.startsWith(p));
  const separator = path.includes('?') ? '&' : '?';
  const bustPath = needsBust ? `${path}${separator}_t=${Date.now()}` : path;
  const directUrl = `${GSMGC_API_DIRECT}${bustPath}`;

  try {
    // ★ v4.5: 不再需要 warmup（SG Bot Protection 已关闭）

    const res = await fetch(directUrl, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
    });

    // 检查是否被 SG 拦截
    const contentType = res.headers.get('Content-Type') || '';
    if (res.status === 202 || (contentType.includes('text/html') && !contentType.includes('json'))) {
      const text = await res.text();
      if (text.includes('.well-known/sgcaptcha') || text.includes('sgcaptcha')) {
        throw new Error('SG_BLOCKED');
      }
      return new Response(text, { status: res.status, headers: res.headers });
    }

    return res;
  } catch (err) {
    console.warn('[GSMGC] Direct fetch error:', (err as Error).name, (err as Error).message);
    // ★ v4.4: CORS 错误 ("Failed to fetch" = TypeError) 也应该走 Vercel rewrite fallback
    if ((err as Error).message === 'SG_BLOCKED' || (err as Error).name === 'TypeError') {
      // 最后手段: Vercel rewrite（307 重定向，可能不工作但试试）
      console.warn('[GSMGC] All methods failed, trying Vercel rewrite...');
      const rewriteUrl = `${GSMGC_API_PROXY}${path}`;
      return fetch(rewriteUrl, {
        ...options,
        headers,
        credentials: 'same-origin',
      });
    }
    throw err;
  }
}

/**
 * 安全解析 JSON 响应
 */
async function parseJSON(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.warn('[GSMGC] Non-JSON response:', text.substring(0, 200));
    throw new Error('Respuesta del servidor no valida');
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * ★ v7.0: 统一构建 billing 对象 — 用后端 _gsmgc_format_user() 约定的 camelCase 字段名
 *   不再猜测字段名（snake_case / billing.xxx / meta.xxx），直接用确定格式。
 *   后端返回格式见 gsmgc-auth.php _gsmgc_format_user() L555-574：
 *     firstName, lastName, email, phone, company, cifNif, address_1, city, postcode
 *
 * @param user — /me API 返回的用户对象
 * @param addrFields — 可编辑的地址字段 { address_1, city, postcode }
 * @returns billing 对象，user 无效时返回 null
 */
export interface BillingAddress {
  address_1?: string;
  city?: string;
  postcode?: string;
}

export function buildBilling(user: GsmgcUser | null, addrFields: BillingAddress = {}): Record<string, string> | null {
  if (!user || !user.id) return null;
  return {
    first_name: (user.firstName as string) || '',
    last_name:  (user.lastName as string) || '',
    email:      (user.email as string) || '',
    phone:      (user.phone as string) || '',
    company:    (user.company as string) || '',
    cif_nif:    (user.cifNif as string) || '',
    address_1:  addrFields.address_1 || '',
    address_2:  '',
    city:       addrFields.city || '',
    postcode:   addrFields.postcode || '',
    state:      'GC',
    country:    'ES',
  };
}

export async function login(email: string, password: string, remember = false): Promise<GsmgcUser> {
  // ★ v6.1: login 前置清除由 AuthContext 处理，这里 skip401 避免密码错误触发熔断
  const res = await smartFetch('/login', {
    method: 'POST',
    skip401: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
  });

  if (!res.ok) {
    const error = await parseJSON(res).catch(() => ({ message: 'Error de conexion' }));
    throw new Error(error.message || 'Email o contrasena incorrectos');
  }

  const data = await parseJSON(res);

  // ★ v8.0: 保存 auth token 到 localStorage（持久登录，关标签页不丢）
  if (data.auth_token) {
    setAuthToken(data.auth_token);
    console.log('[GSMGC] Auth token saved to localStorage');
  }

  // ★ v6.1: 登录后立即调 /me 验证，确保 user 数据来自 API 而非 login 端点
  //    原因：login 端点可能返回不完整的 user，/me 返回的是完整、确认过的数据
  //    ★ v5.9.7: 使用 getCurrentUserSafe 避免 /me 失败触发 401 熔断清掉 token
  let user: GsmgcUser = data.user || data;
  try {
    const meUser = await getCurrentUserSafe();
    if (meUser && meUser.id) {
      user = meUser;
      setCachedUser(meUser);
      console.log('[GSMGC] Login: /me verification passed, using confirmed user data');
    }
  } catch (meErr) {
    console.warn('[GSMGC] Login: /me verification failed, using login response user:', (meErr as Error).message);
    // fallback：用 login 端点的 user（至少有 token）
    if (user && user.id) setCachedUser(user);
  }

  return user;
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    // ★ v6.1: skip401 — logout 本身就是要清除状态，不需要 401 熔断
    await smartFetch('/logout', { method: 'POST', skip401: true });
  } catch (err) {
    console.warn('Logout API error:', err);
  }
  // ★ v6.0: 使用全局 clearAllAuth，确保所有状态归零
  clearAllAuth();
  return { success: true };
}

export async function register(userData: Record<string, string>): Promise<any> {
  const res = await smartFetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await parseJSON(res).catch(() => ({ message: 'Error al registrar' }));
    throw new Error(error.message);
  }

  return parseJSON(res);
}

export async function requestPasswordReset(email: string): Promise<any> {
  const res = await smartFetch('/lost-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const error = await parseJSON(res).catch(() => ({ message: 'Error' }));
    throw new Error(error.message);
  }
  return parseJSON(res);
}

export async function resetPassword(loginVal: string, key: string, password: string): Promise<any> {
  const res = await smartFetch('/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginVal, key, password }),
  });

  if (!res.ok) {
    const error = await parseJSON(res).catch(() => ({ message: 'Error' }));
    throw new Error(error.message);
  }
  return parseJSON(res);
}

export async function getCurrentUser(): Promise<GsmgcUser | null> {
  // ★ 改用统一端点 /api/auth/me（Next.js API route，服务端代理到后端）
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.logged_in && data.user && (data.user as Record<string, unknown>).id) {
      return data.user as GsmgcUser;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentUserSafe(): Promise<GsmgcUser | null> {
  // ★ 改用统一端点 /api/auth/me（Next.js API route，服务端代理）
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.logged_in && data.user && data.user.id) {
      return data.user as GsmgcUser;
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkAuth(): Promise<{ authenticated: boolean; user?: GsmgcUser; [key: string]: unknown }> {
  // ★ 改用统一端点 /api/auth/me（Next.js API route，服务端代理，单次请求即完成鉴权）
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.logged_in && data.user && data.user.id) {
      setCachedUser(data.user);
      return { authenticated: true, user: data.user };
    }
    return { authenticated: false };
  } catch (err) {
    console.warn('[GSMGC] checkAuth error:', err);
    return { authenticated: false };
  }
}

/**
 * 深度检查登录状态：auth-check + /me 双验证
 * 用于关键页面（如 /checkout）需要高置信度确认登录状态的场景
 *
 * 返回值: { authenticated, user } 或 { authenticated: false }
 */
export async function deepCheckAuth(): Promise<{ authenticated: boolean; user?: GsmgcUser }> {
  // ★ 改用统一端点 /api/auth/me（Next.js API route，服务端完成高置信鉴权）
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.logged_in && data.user && data.user.id) {
      setCachedUser(data.user);
      return { authenticated: true, user: data.user };
    }
    return { authenticated: false };
  } catch (err) {
    console.warn('[GSMGC] deepCheckAuth error:', err);
    if ((err as Error).message === 'AUTH_EXPIRED') throw err;
    return { authenticated: false };
  }
}
