'use client';

import { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { getAuthToken } from '@/api/auth';
import { useAuth } from './AuthContext';

// ---------- 类型 ----------

export interface CartItem {
  id: number;
  sku: string;
  name: string;
  price: string;
  regular_price?: string;
  image?: string;
  qty: number;
  stock_quantity?: number | null;
}

interface CartState {
  items: CartItem[];
  _stockErrors?: Record<number, string>;
}

// ★ v9.2: 跨设备购物车快照
interface RemoteSnap {
  device: string;
  time: number;
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'qty'> & { qty?: number } }
  | { type: 'REMOVE_ITEM'; id: number }
  | { type: 'UPDATE_QTY'; id: number; qty: number }
  | { type: 'CLEAR' }
  | { type: 'SET_ITEMS'; items: CartItem[] }
  | { type: 'SET_ERROR'; id: number; error: string | null };

// ---------- 库存校验 (1:1 对齐现站 checkStock) ----------

function checkStock(
  requested: number,
  currentQty: number,
  stockQty: number | null | undefined
): { clamped: number; error: string | null } {
  // null/undefined = 无限库存 (manage_stock=false)
  if (stockQty === null || stockQty === undefined) {
    return { clamped: currentQty + requested, error: null };
  }

  const maxStock = parseInt(String(stockQty)) || 0;

  if (maxStock <= 0) {
    return { clamped: currentQty, error: 'Sin stock disponible' };
  }

  const afterAdd = currentQty + requested;
  if (afterAdd <= maxStock) {
    return { clamped: afterAdd, error: null };
  }

  return {
    clamped: maxStock,
    error: requested > 1 ? `Solo se pueden añadir ${maxStock - currentQty} unidad(es) más (stock: ${maxStock})` : `Stock máximo: ${maxStock}`,
  };
}

// ---------- Reducer ----------

const CART_KEY = 'gsmgc_cart';

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const requestedQty = action.item.qty || 1;
      const existing = state.items.find(i => i.id === action.item.id);
      const currentQty = existing ? existing.qty : 0;

      const { clamped, error } = checkStock(
        requestedQty,
        currentQty,
        action.item.stock_quantity ?? null
      );

      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.item.id ? { ...i, qty: clamped } : i
          ),
          _stockErrors: error
            ? { ...state._stockErrors, [action.item.id]: error }
            : state._stockErrors,
        };
      }

      return {
        ...state,
        items: [...state.items, { ...action.item, qty: clamped }],
        _stockErrors: error
          ? { ...state._stockErrors, [action.item.id]: error }
          : state._stockErrors,
      };
    }

    case 'UPDATE_QTY': {
      const item = state.items.find(i => i.id === action.id);
      if (!item) return state;

      const maxQty = item.stock_quantity !== null && item.stock_quantity !== undefined
        ? Number(item.stock_quantity)
        : Infinity;

      const newQty = Math.max(1, Math.min(action.qty, maxQty === 0 ? 1 : maxQty));

      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, qty: newQty } : i
        ),
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.id),
        _stockErrors: (() => {
          const copy = { ...state._stockErrors };
          delete copy[action.id];
          return copy;
        })(),
      };

    case 'CLEAR':
      return { ...state, items: [], _stockErrors: {} };

    case 'SET_ITEMS': {
      // 防御性校验
      const valid = Array.isArray(action.items)
        ? action.items.filter(i => i && typeof i.id === 'number' && typeof i.qty === 'number')
        : [];
      return { ...state, items: valid };
    }

    case 'SET_ERROR':
      return {
        ...state,
        _stockErrors: action.error
          ? { ...state._stockErrors, [action.id]: action.error }
          : (() => {
              const copy = { ...state._stockErrors };
              delete copy[action.id];
              return copy;
            })(),
      };

    default:
      return state;
  }
}

// ---------- Provider ----------

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clearCart: () => void;
  getStockError: (id: number) => string | null;
  clearStockError: (id: number) => void;
  totalItems: number;
  totalPrice: number;
  // ★ v9.5: 跨设备购物车自动同步
  saveCartSnap: () => Promise<void>;
  pullCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // 从 localStorage 恢复 (带防御校验)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(i => i && typeof i.id === 'number' && typeof i.qty === 'number');
          if (valid.length > 0) {
            dispatch({ type: 'SET_ITEMS', items: valid });
          }
        }
      }
    } catch {
      localStorage.removeItem(CART_KEY);
    }
    // ★ v9.5: 标记 hydration 完成，之后才允许自动保存
    isHydratedRef.current = true;
  }, []);

  // 持久化
  useEffect(() => {
    try {
      const serialized = JSON.stringify(state.items);
      if (serialized.length > 4 * 1024 * 1024) {
        console.warn('[CartContext] Cart data too large, skipping persist');
        return;
      }
      localStorage.setItem(CART_KEY, serialized);
    } catch {
      // storage full or private mode
    }
  }, [state.items]);

  const addItem = useCallback((item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const removeItem = useCallback((id: number) => {
    dispatch({ type: 'REMOVE_ITEM', id });
  }, []);

  const updateQty = useCallback((id: number, qty: number) => {
    dispatch({ type: 'UPDATE_QTY', id, qty });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    // ★ v9.5: 清空立即保存到服务器，其他设备拉取时同步清空
    setTimeout(() => saveImmediateRef.current([]), 50);
  }, []);

  const getStockError = useCallback((id: number): string | null => {
    return state._stockErrors?.[id] || null;
  }, [state._stockErrors]);

  const clearStockError = useCallback((id: number) => {
    dispatch({ type: 'SET_ERROR', id, error: null });
  }, []);

  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.qty, 0);

  // ── ★ v9.8: 版本戳防旧客户端覆盖 ──
  const { user } = useAuth();
  const checkedUserIdRef = useRef<number | null>(null);
  const lastPullRef = useRef<number>(0);
  const isHydratedRef = useRef(false);
  const serverVersionRef = useRef(0);
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  // ★ v9.8: 服务器为权威 — replace 模式 + 版本追踪
  function pullFromServer() {
    const token = getAuthToken();
    if (!token || !user?.id) return;
    const now = Date.now();
    if (lastPullRef.current > 0 && now - lastPullRef.current < 10000) return;
    lastPullRef.current = now;

    fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/cart-snap', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      // ★ v9.8: 记录服务端版本号
      if (data.snap?.v) serverVersionRef.current = data.snap.v;
      if (!data.success || !data.snap || !Array.isArray(data.snap.items)) return;
      dispatch({ type: 'SET_ITEMS', items: data.snap.items });
    })
    .catch(() => {});
  }

  // ★ v9.8: 带版本号的保存 — 旧客户端数据不会覆盖新数据
  function saveImmediate(items?: CartItem[]) {
    const token = getAuthToken();
    if (!token || !user?.id) return;
    const payload = items !== undefined ? items : itemsRef.current;
    fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/cart-snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: payload, v: serverVersionRef.current })
    })
    .then(r => r.json())
    .then(data => {
      if (data.v) serverVersionRef.current = data.v;
      if (data.code === 'stale') pullFromServer(); // 数据过期，立即拉最新
    })
    .catch(() => {});
  }
  const saveImmediateRef = useRef(saveImmediate);
  saveImmediateRef.current = saveImmediate;

  // 登录时自动拉取（掉线重登也触发）
  useEffect(() => {
    const userId = user?.id ?? null;
    // ★ v9.6: 掉线时复位，确保重登触发拉取
    if (!userId) {
      checkedUserIdRef.current = null;
      return;
    }
    if (checkedUserIdRef.current === userId) return;
    checkedUserIdRef.current = userId;
    lastPullRef.current = 0;
    pullFromServer();
  }, [user?.id]);

  // ★ v9.7: 切回页面时拉取（10s 冷却）。
  // 删掉了 hidden 保存 — 切走时保存会覆盖另一设备刚清空的购物车。
  // 800ms 防抖已兜底保存，不需要切走时额外存。
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') pullFromServer();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id]);

  // ★ v9.7: 购物车变化时自动保存（防抖 800ms，含清空）
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id || !isHydratedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveImmediate();
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.items, user?.id]);

  async function saveCartSnap() {
    const token = getAuthToken();
    if (!token) return;
    try {
      await fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/cart-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: state.items })
      });
    } catch {}
  }

  return (
    <CartContext.Provider value={{
      items: state.items,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      getStockError,
      clearStockError,
      totalItems,
      totalPrice,
      saveCartSnap,
      pullCart: pullFromServer,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
