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
  /** 合并 products-paginated 同包返回的价格（候选 X：仅授权响应带价；不覆盖已有；防重复请求） */
  mergePrices: (entries: Record<number, PriceInfo>) => void;
  /** 单个产品价格（无则 null） */
  getPrice: (id: number) => PriceInfo | null;
  /** 是否已登录且有权限（决定 UI 是否显示价格） */
  canViewPrice: boolean;
  /** 401/403 已确认无权（组件据此显示 Ver precio 而非永久骨架） */
  denied: boolean;
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
  /** 401/403 已确认无权（区别于"加载中"：无权显示 Ver precio，加载中显示骨架） */
  const [denied, setDenied] = useState(false);
  const pendingRef = useRef<Set<number>>(new Set());
  const fetchingRef = useRef<Set<number>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 登录/登出/切账户 → 清空价格状态（GATE 3）
  useEffect(() => {
    setPrices({});
    pendingRef.current = new Set();
    fetchingRef.current = new Set();
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    setCanViewPrice(false);
    setDenied(false);
  }, [isLoggedIn, user?.id]);

  const fetchPrices = useCallback(async (ids: number[], attempt = 0) => {
    if (ids.length === 0) return;
    const token = getAuthToken();
    if (!token) return;

    const fresh = ids.filter((id) => !fetchingRef.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => fetchingRef.current.add(id));

    try {
      // GATE 1: Authorization: Bearer（禁止 URL auth_token）+ 10s 超时（防骨架无限挂起）
      const res = await fetch(`${API_PRICES}?ids=${fresh.join(',')}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401 || res.status === 403) {
        setCanViewPrice(false);
        setDenied(true); // 无权：UI 回退 Ver precio（而非永久骨架）
        return;
      }
      if (!res.ok) {
        // 5xx/其他 → 重试最多 2 次（退避 0.8s/1.6s）
        if (attempt < 2) {
          setTimeout(() => fetchPrices(fresh, attempt + 1), 800 * (attempt + 1));
          return;
        }
        return;
      }

      const data = await res.json();
      if (!data.success || !data.prices) {
        if (attempt < 2) {
          setTimeout(() => fetchPrices(fresh, attempt + 1), 800 * (attempt + 1));
          return;
        }
        return;
      }

      setCanViewPrice(true);
      setDenied(false);
      setPrices((prev) => ({ ...prev, ...data.prices }));
    } catch (err) {
      // 网络错误/超时 → 重试最多 2 次（退避 0.8s/1.6s）
      if (attempt < 2) {
        setTimeout(() => fetchPrices(fresh, attempt + 1), 800 * (attempt + 1));
        return;
      }
      console.warn('[Price] fetch failed:', (err as Error).message);
    } finally {
      fresh.forEach((id) => fetchingRef.current.delete(id));
    }
  }, []);

  const ensurePrices = useCallback((ids: number[]) => {
    // 未登录不请求
    if (!isLoggedIn) return;
    let added = false;
    ids.forEach((id) => {
      const hasPrice = prices[id] !== undefined;
      const pending = pendingRef.current.has(id);
      const fetching = fetchingRef.current.has(id);
      if (!hasPrice && !pending && !fetching) {
        pendingRef.current.add(id);
        added = true;
      }
    });
    if (!added) return;
    // ⭐ 批量合并：50ms 窗口内所有 ensurePrices（Tienda 24 卡各自触发）合并为一次请求
    //   （否则 24 个商品卡 = 24 个并发 products-prices 请求 → 骨架显示久）
    if (flushTimerRef.current === null) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        const batch = Array.from(pendingRef.current);
        pendingRef.current = new Set();
        if (batch.length > 0) fetchPrices(batch);
      }, 50);
    }
  }, [isLoggedIn, prices, fetchPrices]);

  /**
   * mergePrices — 候选 X（ISSUE-2026-002）
   * 把 products-paginated 同包返回的价格合并进 prices。
   * 规则：
   *   ① 不覆盖已有价格（products-prices 响应先到则保留，后到则同值覆盖，无害）；
   *   ② 已合并 id 从 pending/fetching 移除（防御：防止兜底 ensurePrices 重复发请求）；
   * 登出/切账户时与 prices 一并清空（现有 GATE 3 effect 覆盖），无串账户风险。
   */
  const mergePrices = useCallback((entries: Record<number, PriceInfo>) => {
    setPrices((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [k, v] of Object.entries(entries)) {
        const id = Number(k);
        if (!next[id] && v.price != null && v.price !== '') {
          next[id] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // 防御：若价格已在 pending 队列或请求中，移除标记避免重复发请求
    for (const k of Object.keys(entries)) {
      pendingRef.current.delete(Number(k));
      fetchingRef.current.delete(Number(k));
    }
  }, []);

  const getPrice = useCallback((id: number): PriceInfo | null => {
    return prices[id] ?? null;
  }, [prices]);

  return (
    <PriceContext.Provider value={{ prices, ensurePrices, mergePrices, getPrice, canViewPrice, denied }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices(): PriceContextType {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error('usePrices must be used within PriceProvider');
  return ctx;
}
