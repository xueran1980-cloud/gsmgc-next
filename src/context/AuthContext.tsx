'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser, getCachedUser, setCachedUser, clearAllAuth, onAuthClear, getAuthToken, GsmgcUser } from '../api/auth';

interface AuthContextType {
  user: GsmgcUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  isPending: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<GsmgcUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<GsmgcUser | null>;
  setUser: (user: GsmgcUser | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GsmgcUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  // ★ 记录上次成功认证的用户ID，refreshUser 失败时不误清
  const lastUserId = useRef<number | null>(null);

  // ★ v6.0: 注册全局清除回调 — clearAllAuth() 时自动清空 React state
  useEffect(() => {
    onAuthClear(() => {
      setUser(null);
      setLoading(false);
    });
  }, []);

  // ★ v6.1: 多 Tab 同步 — 监听 localStorage 变化
  //   当另一个 Tab 登出/清除 token 时，当前 Tab 立即检测到并清除状态
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'gsmgc_auth_token' && !e.newValue) {
        console.warn('[GSMGC] Tab sync: token removed in another tab');
        clearAllAuth();
        // 不 reload — 如果用户在当前 Tab 正在操作（如填表单），不强制打断
        // AuthContext state 已清空，UI 会自动显示未登录状态
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ★ v6.3: 极速 Auth init — 不再阻塞页面渲染
  //   无 token: 0ms → 直接显示未登录状态（可浏览产品）
  //   有 token: 单次轻量 /me（走 Edge Proxy，不触发 SG Captcha）
  //   warmupSGCaptcha 延迟到 login() 时才触发
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      // Step 1: 快速检查 localStorage 有没有 token
      const token = getAuthToken();
      if (!token) {
        // 无 token = 游客，不需要任何 API 调用，直接进页面
        console.log('[GSMGC] Auth init: no token, skipping auth check (guest mode)');
        clearAllAuth();
        setCachedUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Step 2: 有 token → 单次轻量 /me 验证（不走 warmup，走 Edge Proxy）
      //   Edge Proxy (gsmgc.es/api/proxy) 不会被 SG Captcha 拦截
      //   如果 /me 失败说明 token 无效 → clearAllAuth + 显示未登录
      try {
        const userData = await getCurrentUser();
        if (userData && userData.id) {
          console.log('[GSMGC] Auth init SUCCESS: user restored from /me', userData);
          setUser(userData);
          setCachedUser(userData); // ★ v8.0: 缓存到 localStorage，刷新/关闭浏览器不丢
          lastUserId.current = userData.id;
          setLoading(false);
          return;
        }

        // /me 返回空数据 → session 过期
        console.warn('[GSMGC] Auth init: /me returned empty, clearing stale token');
      } catch (err) {
        console.warn('[GSMGC] Auth init: /me failed, clearing stale token:', (err as Error).message || err);
      }

      // token 无效 — 清除并让用户以游客身份浏览
      clearAllAuth();
      setCachedUser(null);
      setUser(null);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    // ★ v6.0: 先彻底清除旧状态，避免 A→B 登录时残留 A 的数据
    clearAllAuth();
    setUser(null);

    const userData = await apiLogin(email, password, remember);
    setUser(userData);

    // ★ POST-LOGIN: 延迟验证 token 是否正常工作（静默执行，不暴露 cookie 信息）
    setTimeout(async () => {
      try {
        const { checkAuth } = await import('../api/auth');
        await checkAuth();
      } catch(e) {
        console.error('[GSMGC] Post-login auth-check error:', e);
      }
    }, 1500);

    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout(); // 内部调 clearAllAuth + skip401
    } catch (err) {
      console.warn('Logout API error:', err);
    }
    // ★ v6.1: 统一 logout redirect — 先清空 state，再 reload 到当前页
    //    reload 会触发 init，init 检测无 token → 显示未登录
    //    如果当前在 /checkout，reload 后会显示"请登录"
    setUser(null);
    window.location.reload();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      if (userData && userData.id) {
        setUser(userData);
        lastUserId.current = userData.id;
        return userData;
      } else {
        // /me 返回了空数据 → session 过期
        console.warn('[GSMGC] refreshUser: /me returned empty data, clearing auth');
        clearAllAuth();
        setUser(null);
        lastUserId.current = null;
        return null;
      }
    } catch (err) {
      // ★ v6.3: 网络错误 vs 401 分开处理
      //   网络错误（TypeError）= 临时故障，保留 auth 状态让用户重试
      //   401 / AUTH_EXPIRED = token 无效，清除 auth
      const isNetworkError = (err as Error).message === 'AUTH_EXPIRED' ||
        ((err as Error).message && (err as Error).message!.includes('401'));
      if (isNetworkError) {
        console.warn('[GSMGC] refreshUser: auth expired, clearing auth');
        clearAllAuth();
        setUser(null);
        lastUserId.current = null;
      } else {
        // 网络/SG 拦截等临时错误 — 保留状态，不强制登出
        console.warn('[GSMGC] refreshUser: network error (preserving auth):', (err as Error).message || err);
      }
      return null;
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    // ★ isLoggedIn 判断逻辑：
    //   1. user 对象必须存在
    //   2. user 必须有 id（确保是有效用户对象）
    //   3. 不能是 pending 状态（兼容两种字段名）
    //   4. account_status 必须是 approved 或不存在（不存在的默认视为 approved）
    isLoggedIn: !!user && !!user.id &&
      (user.account_status === 'approved' || user.account_status === undefined || user.account_status === null) &&
      !user.isPending,
    isPending: (!!user && (user.isPending === true || user.account_status === 'pending')) || false,
    login,
    logout,
    refreshUser,
    setUser, // 暴露给 CheckoutPage 用于 deepCheckAuth 成功后直接恢复状态
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
