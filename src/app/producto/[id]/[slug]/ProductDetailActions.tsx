'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, MessageCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWpLoggedIn } from '@/hooks/useWpLoggedIn';
import { PriceOrLoginPrompt } from '@/components/PriceOrLoginPrompt';

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
    slug: string;
  };
  waMsg: string;
}

export default function ProductDetailActions({ product, waMsg }: ProductDetailActionsProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const isLoggedIn = useWpLoggedIn();

  const inStock = product.stock_status === 'instock';
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
      image,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <>
      {isLoggedIn === "loading" ? (
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-2xl mb-6" />
          <div className="h-6 bg-gray-200 rounded w-32 mb-5" />
          <div className="h-12 bg-gray-200 rounded-xl w-full mb-6" />
        </div>
      ) : isLoggedIn ? (
        /* Logged in: show price + add to cart */
        <>
          {/* Price block */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-6">
            <PriceOrLoginPrompt price={product.price} regularPrice={product.regular_price} />
            {isLoggedIn === true && hasDiscount && (
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
                    · {product.stock_quantity === 1
                      ? '¡Última unidad!'
                      : product.stock_quantity <= 5
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

          {/* Out of stock OR Quantity + Add to cart */}
          {!inStock ? (
            <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed mb-6">
              Sin stock
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-12 text-gray-600 hover:bg-gray-50 transition text-lg font-bold flex items-center justify-center"
                  type="button"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-center font-black text-lg border-x border-gray-100 h-12 focus:outline-none"
                  min={1}
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
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
      ) : (
        /* Guest: show "Precio exclusivo B2B" block */
        <>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-6 text-center">
            <div className="text-lg font-bold text-gray-700 mb-2">Precio exclusivo B2B</div>
            <div className="text-sm text-gray-500 mb-4">Solo visible para clientes registrados y aprobados</div>
            <Link
              href="/mi-cuenta?register=1"
              className="inline-flex items-center gap-2 bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1d4ed8] transition"
            >
              Registrarse para ver precios
            </Link>
          </div>

          {/* Stock indicator (always visible) */}
          <div className="flex items-center gap-2 mb-5">
            {inStock ? (
              <span className="text-green-700 font-semibold text-sm">En stock</span>
            ) : (
              <span className="text-red-600 font-semibold text-sm">Sin stock</span>
            )}
          </div>

          {/* WhatsApp CTA (always visible) */}
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
      )}
    </>
  );
}
