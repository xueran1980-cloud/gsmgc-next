// GSMGC Authentication API
//
// ★ v6.1: 接入三层模型
//   Layer 1: fetchWithFallbackClient（纯执行器）
//   Layer 2: parseApiResponse / fetchAndParse（解析+分类）
//   Layer 3: auth.ts（纯业务映射）
//
// 铁律：
//   1. /me 失败 ≠ 未登录，只有 reason=unauthorized 才算未登录
//   2. 401 熔断在 Layer 3 处理（clearAllAuth）
//   3. login/register/requestPasswordReset/resetPassword 保留直接 fetch
//      但用 parseApiResponse 统一解析

import { fetchWithFallbackClient } from '@/lib/fetchWithFallback';
import { parseApiResponse, fetchAndParse, type FetchResult } from '@/lib/apiParser';

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

/**
 * 从多种 WP 响应格式中提取用户
 */
function extractUser(data: Record<string, unknown>): GsmgcUser | null {
  if (data.success && data.user && (data.user as Record<string, unknown>).id) return data.user as GsmgcUser;
  if (data.logged_in && data.user && (data.user as Record<string, unknown>).id) return data.user as GsmgcUser;
  if (data.id) return data as GsmgcUser;
  return null;
}

export async function login(email: string, password: string, remember = false): Promise<GsmgcUser> {
  // 走 Next.js API 路由（内部走 proxy 到 WP）
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
    cache: 'no-store',
  });

  const result = await parseApiResponse<any>(res);

  if (!result.ok) {
    throw new Error(result.data?.message || 'Email o contrasena incorrectos');
  }

  const data = result.data;
  if (data.auth_token) {
    setAuthToken(data.auth_token);
    console.debug('[GSMGC] Auth token saved to localStorage');
  }

  // 登录后验证 /me（使用 getCurrentUserSafe 避免 401 熔断清掉刚保存的 token）
  let user: GsmgcUser = data.user || data;

  // Bug fix: 无论 /me 返回什么，先缓存登录响应的用户（避免跨页面丢失）
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
    // logout 不关心 401（本来就要清 token）
    const token = getAuthToken();
    if (token) {
      await fetchWithFallbackClient('/wp-json/gsmgc/v1/logout', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      }, token).catch(() => {});  // 忽略错误，反正要清 token
    }
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

  const result = await parseApiResponse<any>(res);

  if (!result.ok) {
    throw new Error(result.data?.message || 'Error al registrar');
  }

  return result.data;
}

export async function requestPasswordReset(email: string): Promise<any> {
  const res = await fetch('/api/auth/lost-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  });

  const result = await parseApiResponse<any>(res);

  if (!result.ok) {
    throw new Error(result.data?.message || 'Error');
  }

  return result.data;
}

export async function resetPassword(loginVal: string, key: string, password: string): Promise<any> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginVal, key, password }),
    cache: 'no-store',
  });

  const result = await parseApiResponse<any>(res);

  if (!result.ok) {
    throw new Error(result.data?.message || 'Error');
  }

  return result.data;
}

/**
 * getCurrentUser — Layer 3 业务映射
 *
 * 铁律：
 *   - 只有 reason=unauthorized 才清 token
 *   - 其他错误（cf_blocked / server_error / network）→ 用缓存兜底，不清 token
 */
export async function getCurrentUser(): Promise<GsmgcUser | null> {
  const token = getAuthToken();
  if (!token) return getCachedUser();

  // Layer 1+2: fetchWithFallbackClient + fetchAndParse
  const result: FetchResult<Record<string, unknown>> = await fetchAndParse<Record<string, unknown>>(
    fetchWithFallbackClient('/wp-json/gsmgc/v1/me', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, token)
  );

  // Layer 3: 业务映射
  if (result.ok && result.data) {
    const user = extractUser(result.data);
    if (user) {
      setCachedUser(user);
      return user;
    }
    // API 返回了但无有效用户 → 用缓存兜底
    return getCachedUser();
  }

  // Layer 3: 错误分类处理
  switch (result.reason) {
    case 'unauthorized':
      // 真正 401 → 清 token
      console.warn('[GSMGC] getCurrentUser: 401 Unauthorized, clearing auth');
      clearAllAuth();
      return null;

    case 'cf_blocked':
    case 'server_error':
    case 'network':
    case 'parse_error':
    case 'http_error':
      // 非 401 错误 → 用缓存兜底，不清 token
      console.warn(`[GSMGC] getCurrentUser: ${result.reason}, using cached user`);
      return getCachedUser();

    default:
      return getCachedUser();
  }
}

/**
 * getCurrentUserSafe — 同 getCurrentUser，但不触发 401 熔断
 * 用于登录后验证等场景
 */
export async function getCurrentUserSafe(): Promise<GsmgcUser | null> {
  const token = getAuthToken();
  if (!token) return getCachedUser();

  const result = await fetchAndParse<Record<string, unknown>>(
    fetchWithFallbackClient('/wp-json/gsmgc/v1/me', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, token)
  );

  if (result.ok && result.data) {
    const user = extractUser(result.data);
    if (user) {
      setCachedUser(user);
      return user;
    }
    return getCachedUser();
  }

  // 即使是 unauthorized，也不清 token（Safe 版本）
  return getCachedUser();
}

export async function checkAuth(): Promise<{ authenticated: boolean; user?: GsmgcUser; [key: string]: unknown }> {
  const token = getAuthToken();
  if (!token) return { authenticated: false };

  const result = await fetchAndParse<Record<string, unknown>>(
    fetchWithFallbackClient('/wp-json/gsmgc/v1/me', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, token)
  );

  if (result.ok && result.data) {
    const user = extractUser(result.data);
    if (user) {
      setCachedUser(user);
      return { authenticated: true, user };
    }
  }

  return { authenticated: false };
}

export async function deepCheckAuth(): Promise<{ authenticated: boolean; user?: GsmgcUser }> {
  const result = await fetchAndParse<Record<string, unknown>>(
    fetchWithFallbackClient('/wp-json/gsmgc/v1/me', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, getAuthToken() || undefined)
  );

  if (result.ok && result.data) {
    const user = extractUser(result.data);
    if (user) {
      setCachedUser(user);
      return { authenticated: true, user };
    }
  }

  // deepCheckAuth: 如果是 unauthorized，抛异常（调用者可能需要处理）
  if (result.reason === 'unauthorized') {
    throw new Error('AUTH_EXPIRED');
  }

  return { authenticated: false };
}
