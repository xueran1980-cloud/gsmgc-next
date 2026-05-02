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
  const lastUserId = useRef<number | null>(null);

  // ★ v6.0: 注册全局清除回调 — 只在 401 / 主动登出时触发
  useEffect(() => {
    onAuthClear(() => {
      setUser(null);
      setLoading(false);
    });
  }, []);

  // ★ v6.1: 多 Tab 同步
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'gsmgc_auth_token' && !e.newValue) {
        console.warn('[GSMGC] Tab sync: token removed in another tab');
        clearAllAuth();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ★ v7.0: Auth init — 关键改进
  //   1. 无 token: 直接进游客模式
  //   2. 有 token + localStorage 有缓存 user: 先用缓存恢复 UI，后台静默验证
  //   3. /me 失败 ≠ 清 token（只有 401 才清）
  //   4. refreshUser 网络错误 → 保留状态不清 token
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const token = getAuthToken();
      if (!token) {
        console.log('[GSMGC] Auth init: no token, guest mode');
        setUser(null);
        setLoading(false);
        return;
      }

      // ★ v7.0: 先从 localStorage 恢复缓存的 user（极速 UI 恢复）
      const cachedUser = getCachedUser();
      if (cachedUser && cachedUser.id) {
        console.log('[GSMGC] Auth init: restored from cache (user:', cachedUser.id, ')');
        setUser(cachedUser);
        lastUserId.current = cachedUser.id;
        setLoading(false); // ★ 先解锁 UI，不阻塞页面渲染
      }

      // ★ 后台静默验证 /me（不阻塞 UI）
      try {
        const userData = await getCurrentUser();
        if (userData && userData.id) {
          console.log('[GSMGC] Auth init: /me verified, user:', userData.id);
          setUser(userData);
          setCachedUser(userData);
          lastUserId.current = userData.id;
        } else {
          // /me 返回 false（不是 401）→ 可能是 CF 拦截/网络问题
          // ★ 不清 token！保留缓存 user，让用户继续浏览
          console.warn('[GSMGC] Auth init: /me returned false (not 401), keeping cached state');

          // 如果没有缓存 user，才设为 null
          if (!cachedUser) {
            setUser(null);
          }
        }
      } catch (err) {
        // 网络错误 / AUTH_EXPIRED
        if ((err as Error).message === 'AUTH_EXPIRED') {
          // ★ 只有 401 才清 token
          console.warn('[GSMGC] Auth init: 401 from /me, clearing auth');
          clearAllAuth();
          setUser(null);
          lastUserId.current = null;
        } else {
          // 网络错误 → 不清 token，保留缓存
          console.warn('[GSMGC] Auth init: network error, keeping cached state');
        }
      }

      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    clearAllAuth();
    setUser(null);

    const userData = await apiLogin(email, password, remember);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Logout API error:', err);
    }
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
        // /me 返回 false → 不清 token（不是 401）
        console.warn('[GSMGC] refreshUser: /me returned false, keeping auth state');
        return null;
      }
    } catch (err) {
      if ((err as Error).message === 'AUTH_EXPIRED') {
        // ★ 只有 401 才清
        console.warn('[GSMGC] refreshUser: 401, clearing auth');
        clearAllAuth();
        setUser(null);
        lastUserId.current = null;
      } else {
        // 网络错误 → 保留状态
        console.warn('[GSMGC] refreshUser: network error (preserving auth):', (err as Error).message || err);
      }
      return null;
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isLoggedIn: !!user && !!user.id &&
      (user.account_status === 'approved' || user.account_status === undefined || user.account_status === null) &&
      !user.isPending,
    isPending: (!!user && (user.isPending === true || user.account_status === 'pending')) || false,
    login,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
