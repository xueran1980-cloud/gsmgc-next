'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';

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

// ---------- 库存校验 (1:1 对齐现站 checkStock) ----------

function checkStock(
  requested: number,
  currentQty: number,
  stockQty: number | null | undefined
): { clamped: number; error: string | null } {
  // null/undefined = 无限库存 (manage_stock=false)
  if (stockQty === null || stockQty === undefined || stockQty === ") {
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
  }, []);

  const getStockError = useCallback((id: number): string | null => {
    return state._stockErrors?.[id] || null;
  }, [state._stockErrors]);

  const clearStockError = useCallback((id: number) => {
    dispatch({ type: 'SET_ERROR', id, error: null });
  }, []);

  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.qty, 0);

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
