'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { getAuthToken } from '@/api/auth';
import { useAuth } from './AuthContext';

// ---------- 类型 ----------

export interface PriceInfo {
  price: string;
  regular_price: string;
  sale_price: string;
  min_qty: number;
}

interface PriceContextType {
  /** productId → PriceInfo；未登录/未授权时无条目 */
  prices: Record<number, PriceInfo>;
  /** 批量请求价格（登录后由组件调用；自动去重） */
  ensurePrices: (ids: number[]) => void;
  /** 单个产品价格（无则 null） */
  getPrice: (id: number) => PriceInfo | null;
  /** 是否已登录且有权限（决定 UI 是否显示价格） */
  canViewPrice: boolean;
}

const PriceContext = createContext<PriceContextType | null>(null);

const API_PRICES = 'https://api.gsmgc.es/wp-json/gsmgc/v1/products-prices';

/**
 * PriceContext — ISSUE-2026-002 Phase 2
 * 唯一价格来源：products-prices（Authorization: Bearer，no-store）
 * 规则：禁止 URL auth_token；登录拉取/登出清空/切账户清空
 */
export function PriceProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAuth();
  const [prices, setPrices] = useState<Record<number, PriceInfo>>({});
  const [canViewPrice, setCanViewPrice] = useState(false);
  const pendingRef = useRef<Set<number>>(new Set());
  const fetchingRef = useRef<Set<number>>(new Set());

  // 登录/登出/切账户 → 清空价格状态（GATE 3）
  useEffect(() => {
    setPrices({});
    pendingRef.current = new Set();
    fetchingRef.current = new Set();
    setCanViewPrice(false);
  }, [isLoggedIn, user?.id]);

  const fetchPrices = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    const token = getAuthToken();
    if (!token) return;

    const fresh = ids.filter((id) => !fetchingRef.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => fetchingRef.current.add(id));

    try {
      // GATE 1: Authorization: Bearer（禁止 URL auth_token）
      const res = await fetch(`${API_PRICES}?ids=${fresh.join(',')}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (res.status === 401 || res.status === 403) {
        setCanViewPrice(false);
        return; // 未授权：不设置价格
      }
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success || !data.prices) return;

      setCanViewPrice(true);
      setPrices((prev) => ({ ...prev, ...data.prices }));
    } catch (err) {
      console.warn('[Price] fetch failed:', (err as Error).message);
    } finally {
      fresh.forEach((id) => fetchingRef.current.delete(id));
    }
  }, []);

  const ensurePrices = useCallback((ids: number[]) => {
    // 未登录不请求
    if (!isLoggedIn) return;
    const need = ids.filter((id) => {
      const hasPrice = prices[id] !== undefined;
      const pending = pendingRef.current.has(id);
      const fetching = fetchingRef.current.has(id);
      return !hasPrice && !pending && !fetching;
    });
    if (need.length === 0) return;
    need.forEach((id) => pendingRef.current.add(id));
    fetchPrices(need);
  }, [isLoggedIn, prices, fetchPrices]);

  const getPrice = useCallback((id: number): PriceInfo | null => {
    return prices[id] ?? null;
  }, [prices]);

  return (
    <PriceContext.Provider value={{ prices, ensurePrices, getPrice, canViewPrice }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices(): PriceContextType {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error('usePrices must be used within PriceProvider');
  return ctx;
}
