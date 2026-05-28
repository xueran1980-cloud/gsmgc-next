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

type CartAction =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'qty'> & { qty?: number } }
  | { type: 'REMOVE_ITEM'; id: number }
  | { type: 'UPDATE_QTY'; id: number; qty: number }
  | { type: 'CLEAR' }
  | { type: 'SET_ITEMS'; items: CartItem[] }
  | { type: 'SET_ERROR'; id: number; error: string | null };

// ---------- 库存校验 ----------

function checkStock(
  requested: number,
  currentQty: number,
  stockQty: number | null | undefined
): { clamped: number; error: string | null } {
  if (stockQty === null || stockQty === undefined) {
    return { clamped: currentQty + requested, error: null };
  }
  const maxStock = parseInt(String(stockQty)) || 0;
  if (maxStock <= 0) return { clamped: currentQty, error: 'Sin stock disponible' };
  const afterAdd = currentQty + requested;
  if (afterAdd <= maxStock) return { clamped: afterAdd, error: null };
  return {
    clamped: maxStock,
    error: requested > 1
      ? `Solo se pueden añadir ${maxStock - currentQty} unidad(es) más (stock: ${maxStock})`
      : `Stock máximo: ${maxStock}`,
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
      const { clamped, error } = checkStock(requestedQty, currentQty, action.item.stock_quantity ?? null);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i => i.id === action.item.id ? { ...i, qty: clamped } : i),
          _stockErrors: error ? { ...state._stockErrors, [action.item.id]: error } : state._stockErrors,
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.item, qty: clamped }],
        _stockErrors: error ? { ...state._stockErrors, [action.item.id]: error } : state._stockErrors,
      };
    }
    case 'UPDATE_QTY': {
      const item = state.items.find(i => i.id === action.id);
      if (!item) return state;
      const maxQty = item.stock_quantity !== null && item.stock_quantity !== undefined
        ? Number(item.stock_quantity) : Infinity;
      const newQty = Math.max(1, Math.min(action.qty, maxQty === 0 ? 1 : maxQty));
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, qty: newQty } : i) };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.id),
        _stockErrors: (() => { const c = { ...state._stockErrors }; delete c[action.id]; return c; })(),
      };
    case 'CLEAR':
      return { ...state, items: [], _stockErrors: {} };
    case 'SET_ITEMS': {
      const valid = Array.isArray(action.items)
        ? action.items.filter(i => i && typeof i.id === 'number' && typeof i.qty === 'number') : [];
      return { ...state, items: valid };
    }
    case 'SET_ERROR':
      return {
        ...state,
        _stockErrors: action.error
          ? { ...state._stockErrors, [action.id]: action.error }
          : (() => { const c = { ...state._stockErrors }; delete c[action.id]; return c; })(),
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
  saveCartSnap: () => Promise<void>;
  pullCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // ── localStorage 恢复 ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(i => i && typeof i.id === 'number' && typeof i.qty === 'number');
          if (valid.length > 0) dispatch({ type: 'SET_ITEMS', items: valid });
        }
      }
    } catch { localStorage.removeItem(CART_KEY); }
    isHydratedRef.current = true;
  }, []);

  // ── localStorage 持久化 ──
  useEffect(() => {
    try {
      const s = JSON.stringify(state.items);
      if (s.length < 4 * 1024 * 1024) localStorage.setItem(CART_KEY, s);
    } catch { /* storage full */ }
  }, [state.items]);

  // ── 操作方法 ──
  const addItem = useCallback((item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    dispatch({ type: 'ADD_ITEM', item });
  }, []);
  const removeItem = useCallback((id: number) => { dispatch({ type: 'REMOVE_ITEM', id }); }, []);
  const updateQty = useCallback((id: number, qty: number) => { dispatch({ type: 'UPDATE_QTY', id, qty }); }, []);
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    setTimeout(() => saveImmediateRef.current([]), 50);
  }, []);
  const getStockError = useCallback((id: number): string | null => state._stockErrors?.[id] || null, [state._stockErrors]);
  const clearStockError = useCallback((id: number) => { dispatch({ type: 'SET_ERROR', id, error: null }); }, []);

  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.qty, 0);

  // ═══════════════════════════════════════════
  // ★ v12.0: 极简跨设备同步
  //   登录 → 拉取替换本地
  //   改购物车 → 800ms 保存到服务器
  //   清空 → 立即存空
  //   其他设备登录 → 拉到最新
  // ═══════════════════════════════════════════

  const { user } = useAuth();
  const checkedUserIdRef = useRef<number | null>(null);
  const isHydratedRef = useRef(false);
  const serverVersionRef = useRef(0);
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  // ── 拉取：服务器替换本地 ──
  function pullFromServer() {
    const token = getAuthToken();
    if (!token || !user?.id) return;
    fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/cart-snap', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      // 记录版本号（即使 snap 为 null 也标记拉取完成）
      if (data.snap?.v) serverVersionRef.current = data.snap.v;
      else if (data.success) serverVersionRef.current = 1;
      // 应用数据
      if (data.success && data.snap && Array.isArray(data.snap.items)) {
        dispatch({ type: 'SET_ITEMS', items: data.snap.items });
      }
    })
    .catch(() => {});
  }

  // ── 保存：带版本号防旧设备覆盖 ──
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
      if (data.code === 'stale') pullFromServer();
    })
    .catch(() => {});
  }
  const saveImmediateRef = useRef(saveImmediate);
  saveImmediateRef.current = saveImmediate;

  // ── 登录时拉取 ──
  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) { checkedUserIdRef.current = null; return; }
    if (checkedUserIdRef.current === userId) return;
    checkedUserIdRef.current = userId;
    pullFromServer();
  }, [user?.id]);

  // ── 购物车变化时保存（800ms 防抖）──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user?.id || !isHydratedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveImmediate(), 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
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
      items: state.items, addItem, removeItem, updateQty, clearCart,
      getStockError, clearStockError, totalItems, totalPrice,
      saveCartSnap, pullCart: pullFromServer,
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
