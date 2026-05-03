// GSMGC Authentication API
//
// ★ v5.0: 单通道架构 — 所有请求只走 /api/proxy/wp-json/gsmgc/v1/
//   禁止直连 api.gsmgc.es（CF Bot Fight Mode 拦截）
//   禁止 CORS 直连 fallback
//   禁止 Vercel rewrite 307 fallback
//
//   铁律：
//   1. 只有一个数据入口：/api/proxy/*
//   2. /me 失败 ≠ 未登录，只有 401 才清 token
//   3. cookie 必须透传

import { API_BASE } from '../config/api';

/**
 * ★ v6.0: 全局唯一清除函数
 * 只在 401 / 用户主动登出 / 切换账号时调用
 * 网络错误、CF 拦截、500 等 → 不调此函数
 */
let _onClearCallback: (() => void) | null = null;

export function clearAllAuth(): void {
  if (typeof window === 'undefined') return;
  console.warn('[GSMGC] clearAllAuth: clearing all auth state');
  setAuthToken(null);
  if (_onClearCallback) _onClearCallback();
}

export function onAuthClear(cb: () => void): void {
  _onClearCallback = cb;
}

/**
 * Token 管理（localStorage 持久化）
 */
const TOKEN_KEY = 'gsmgc_auth_token';
const USER_KEY  = 'gsmgc_auth_user';

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
      localStorage.removeItem(USER_KEY);
    }
  } catch {}
}

/**
 * 本地 user 缓存（localStorage 持久化）
 * AuthContext 初始化时可立即恢复 UI 状态
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
    if (user && typeof user === 'object' && user.id) return user;
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
 * ★ v5.0: smartFetch — 单通道，只走 /api/proxy/
 *   砍掉所有 fallback（直连 CORS、Vercel rewrite 307、Edge Proxy 直连）
 *
 * 铁律：
 *   - 只有一条路径：/api/proxy/wp-json/gsmgc/v1/{path}
 *   - 401 → clearAllAuth + throw AUTH_EXPIRED
 *   - 其他错误（网络/5xx/CF拦截）→ 不清 token，返回原始 response
 */
export async function smartFetch(path: string, options: RequestInit & { skip401?: boolean } = {}): Promise<Response> {
  const { skip401 = false, ...fetchOptions } = options;
  const method = (options.method || 'GET').toUpperCase();

  // 自动附加 Bearer token
  const token = getAuthToken();
  const headers: Record<string, string> = { ...(fetchOptions.headers as Record<string, string> || {}) };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  headers['User-Agent'] = headers['User-Agent'] || 'GSMGC-Next.js/1.0';
  headers['Accept'] = headers['Accept'] || 'application/json';

  // ★ 唯一通道：/api/proxy/wp-json/gsmgc/v1/{path}
  const proxyUrl = `${API_BASE}${path}`;
  console.debug('[GSMGC] smartFetch:', method, path, '→ /api/proxy');

  try {
    const res = await fetch(proxyUrl, {
      ...fetchOptions,
      method,
      headers,
      credentials: 'same-origin',
    });

    // ★ 401 熔断 — 只有 401 才清 token
    if (res.status === 401 && !skip401) {
      console.warn('[GSMGC] smartFetch: 401 Unauthorized, clearing auth');
      clearAllAuth();
      throw new Error('AUTH_EXPIRED');
    }

    // ★ 非 401 错误（5xx、网络等）— 不清 token，返回原始 response 让调用者处理
    return res;
  } catch (err) {
    // 如果是 AUTH_EXPIRED（我们刚 throw 的），直接抛
    if ((err as Error).message === 'AUTH_EXPIRED') throw err;

    // 网络错误 → 不清 token，throw 让调用者知道
    console.warn('[GSMGC] smartFetch: network error for', path, ':', (err as Error).message);
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
  // 走 Next.js API 代理（内部走 proxy）
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await parseJSON(res).catch(() => ({ message: 'Error de conexion' }));
    throw new Error(error.message || 'Email o contrasena incorrectos');
  }

  const data = await parseJSON(res);

  if (data.auth_token) {
    setAuthToken(data.auth_token);
    console.debug('[GSMGC] Auth token saved to localStorage');
  }

  // ★ 登录后验证 /me（用 getCurrentUserSafe 避免 401 熔断清掉刚保存的 token）
  let user: GsmgcUser = data.user || data;

  // ★ Bug fix: 无论 /me 返回什么，先缓存登录响应的用户（避免跨页面丢失）
  if (user && user.id) {
    setCachedUser(user);
  }

  try {
    const meUser = await getCurrentUserSafe();
    if (meUser && meUser.id) {
      user = meUser;
      setCachedUser(meUser);
      console.debug('[GSMGC] Login: /me verification passed');
    } else {
      console.debug('[GSMGC] Login: /me returned no user, using login response (cached)');
    }
  } catch (meErr) {
    console.warn('[GSMGC] Login: /me verification failed:', (meErr as Error).message);
  }

  return user;
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    await smartFetch('/logout', { method: 'POST', skip401: true });
  } catch (err) {
    console.warn('Logout API error:', err);
  }
  clearAllAuth();
  return { success: true };
}

export async function register(userData: Record<string, string>): Promise<any> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
    cache: 'no-store',
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

/**
 * getCurrentUser — 走 /api/auth/me（Next.js API route → proxy）
 * ★ v5.0: /me 返回 false 不清 token（可能只是 CF 拦截/网络抖动）
 */
export async function getCurrentUser(): Promise<GsmgcUser | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
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

/**
 * getCurrentUserSafe — 同 getCurrentUser，但不触发 401 熔断
 */
export async function getCurrentUserSafe(): Promise<GsmgcUser | null> {
  return getCurrentUser();
}

export async function checkAuth(): Promise<{ authenticated: boolean; user?: GsmgcUser; [key: string]: unknown }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
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

export async function deepCheckAuth(): Promise<{ authenticated: boolean; user?: GsmgcUser }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
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
