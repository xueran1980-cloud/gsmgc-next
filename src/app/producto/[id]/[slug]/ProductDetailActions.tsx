'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, Lock, MessageCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface ProductDetailActionsProps {
  product: {
    id: number;
    name: string;
    sku: string;
    price: string;
    regular_price: string;
    stock_quantity: number | null;
    stock_status: string;
    images: Array<{ src: string }>;
    min_qty: number;
    slug: string;
  };
  waMsg: string;
}

export default function ProductDetailActions({ product, waMsg }: ProductDetailActionsProps) {
  const { addItem } = useCart();
  const { isAuthenticated, loading } = useAuth();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(product.min_qty || 1);

  const inStock = product.stock_status === 'instock';
  const stock = product.stock_quantity || 0;
  const minQty = product.min_qty || 1;
  const image = product.images?.[0]?.src;
  const hasDiscount = parseFloat(product.regular_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.regular_price)) * 100)
    : 0;

  function handleAdd() {
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock,
      image,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  // 未登录 — 对齐现站：显示 "Registrarse para ver precios"
  if (!loading && !isAuthenticated) {
    return (
      <>
        {/* Price block — 未登录 */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-6">
          <Link
            href="/mi-cuenta?register=1"
            className="flex items-center gap-2 text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition"
          >
            <Lock size={18} />
            Registrarse para ver precios
          </Link>
          <div className="text-sm text-gray-400 mt-1">Precio exclusivo B2B</div>
        </div>

        {/* Stock indicator */}
        <div className="flex items-center gap-2 mb-5">
          {inStock ? (
            <>
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0" />
              <span className="text-green-700 font-semibold text-sm">En stock</span>
              {product.stock_quantity !== null && product.stock_quantity !== undefined && (
                <span className={`text-sm font-medium ${
                  product.stock_quantity <= 5 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  · {product.stock_quantity <= 5
                    ? `¡Solo quedan ${product.stock_quantity}!`
                    : `${product.stock_quantity} unidades`
                  }
                </span>
              )}
            </>
          ) : (
            <span className="text-red-600 font-semibold text-sm">Sin stock</span>
          )}
        </div>

        {/* Register CTA */}
        <Link
          href="/mi-cuenta?register=1"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#ea580c] text-white font-bold hover:bg-[#c24a0a] transition shadow-lg mb-6 text-sm"
        >
          <Lock size={18} />
          Registrarse para ver precios
        </Link>

        {/* WhatsApp CTA */}
        <a
          href={`https://wa.me/34688560560?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#25d366] text-[#128c7e] font-semibold hover:bg-[#25d366]/5 transition mb-6 text-sm"
        >
          <MessageCircle size={18} />
          Consultar por WhatsApp
        </a>
      </>
    );
  }

  // 已登录 — 显示价格 + 购物车
  return (
    <>
      {/* Price block */}
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-6">
        <div className="flex items-end gap-3 flex-wrap">
          <span className="text-4xl font-black text-[#2563eb]">
            €{parseFloat(product.price || '0').toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xl text-gray-300 line-through mb-0.5">
              €{parseFloat(product.regular_price).toFixed(2)}
            </span>
          )}
          <span className="text-gray-400 text-sm mb-1">+ IVA/IGIC</span>
        </div>
        {hasDiscount && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#ea580c]/10 text-[#ea580c] text-sm font-bold px-3 py-1 rounded-full">
            Ahorras €{(parseFloat(product.regular_price) - parseFloat(product.price)).toFixed(2)} ({discountPct}% dto.)
          </div>
        )}
      </div>

      {/* Stock indicator */}
      <div className="flex items-center gap-2 mb-5">
        {inStock ? (
          <>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0" />
            <span className="text-green-700 font-semibold text-sm">En stock</span>
            {product.stock_quantity !== null && product.stock_quantity !== undefined && (
              <span className={`text-sm font-medium ${
                product.stock_quantity <= 5 ? 'text-amber-600' : 'text-gray-400'
              }`}>
                · {product.stock_quantity <= 5
                  ? `¡Solo quedan ${product.stock_quantity}!`
                  : `${product.stock_quantity} unidades`
                }
              </span>
            )}
          </>
        ) : (
          <span className="text-red-600 font-semibold text-sm">Sin stock</span>
        )}
      </div>

      {/* Min quantity notice */}
      {product.min_qty > 1 && inStock && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
          Cantidad mínima de compra: <strong>{product.min_qty} unidades</strong>
        </div>
      )}

      {/* Out of stock */}
      {!inStock ? (
        <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed mb-6">
          Sin stock
        </div>
      ) : (
        /* Quantity + Add to cart */
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setQty((q) => Math.max(minQty, q - 1))}
              className="w-11 h-12 text-gray-600 hover:bg-gray-50 transition text-lg font-bold flex items-center justify-center"
              type="button"
            >
              −
            </button>
            <input
              type="number"
              value={qty}
              onChange={e => setQty(Math.max(minQty, parseInt(e.target.value) || minQty))}
              className="w-14 text-center font-black text-lg border-x border-gray-100 h-12 focus:outline-none"
              min={minQty}
            />
            <button
              onClick={() => setQty((q) => Math.min(stock, q + 1))}
              className="w-11 h-12 text-gray-600 hover:bg-gray-50 transition text-lg font-bold flex items-center justify-center"
              type="button"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={added}
            className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base ${
              added
                ? 'bg-green-500 text-white'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {added ? (
              <>
                <Check size={18} />
                Añadido al carrito
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                Añadir al carrito
              </>
            )}
          </button>
        </div>
      )}

      {/* WhatsApp CTA */}
      <a
        href={`https://wa.me/34688560560?text=${waMsg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#25d366] text-[#128c7e] font-semibold hover:bg-[#25d366]/5 transition mb-6 text-sm"
      >
        <MessageCircle size={18} />
        {inStock ? 'Consultar por WhatsApp' : 'Pedir cuando haya stock'}
      </a>
    </>
  );
}
