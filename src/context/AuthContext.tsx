'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type User,
  getToken,
  setToken,
  clearToken,
  login as apiLogin,
  register as apiRegister,
  authCheck,
  logout as apiLogout,
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Parameters<typeof apiRegister>[0]) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：读 localStorage token → authCheck → 设置 user
  useEffect(() => {
    async function init() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const u = await authCheck();
        setUser(u);
      } catch {
        // token 无效，已自动清除
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const { user: u } = await apiLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data: Parameters<typeof apiRegister>[0]) => {
    const result = await apiRegister(data);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authCheck();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
