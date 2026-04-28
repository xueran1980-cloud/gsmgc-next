'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';

// ---------- 类型 ----------

export interface CartItem {
  id: number;
  sku: string;
  name: string;
  price: string;
  regular_price?: string;
  stock: number;
  image?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'qty'> & { qty?: number } }
  | { type: 'REMOVE_ITEM'; id: number }
  | { type: 'UPDATE_QTY'; id: number; qty: number }
  | { type: 'CLEAR' }
  | { type: 'SET_ITEMS'; items: CartItem[] };

// ---------- Reducer ----------

const CART_KEY = 'gsmgc_cart';

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        // 累加数量，不超过库存
        const newQty = Math.min(existing.qty + (action.item.qty || 1), action.item.stock || 9999);
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, qty: newQty } : i,
          ),
        };
      }
      // 新增，数量不超过库存
      const qty = Math.min(action.item.qty || 1, action.item.stock || 9999);
      return { ...state, items: [...state.items, { ...action.item, qty }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, qty: Math.max(1, Math.min(action.qty, i.stock || 9999)) } : i,
        ),
      };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'SET_ITEMS':
      return { ...state, items: action.items };
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
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // 从 localStorage 恢复
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const items = JSON.parse(saved);
        dispatch({ type: 'SET_ITEMS', items });
      }
    } catch {
      // ignore
    }
  }, []);

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addItem = (item: Omit<CartItem, 'qty'> & { qty?: number }) =>
    dispatch({ type: 'ADD_ITEM', item });
  const removeItem = (id: number) => dispatch({ type: 'REMOVE_ITEM', id });
  const updateQty = (id: number, qty: number) => dispatch({ type: 'UPDATE_QTY', id, qty });
  const clearCart = () => dispatch({ type: 'CLEAR' });

  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = state.items.reduce(
    (sum, i) => sum + parseFloat(i.price || '0') * i.qty,
    0,
  );

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
