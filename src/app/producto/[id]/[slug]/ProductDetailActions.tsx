'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShoppingCart, Check, MessageCircle, Lock, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { PriceOrLoginPrompt } from '@/components/PriceOrLoginPrompt';
import type { ProductImage } from '@/lib/api';

interface ProductDetailActionsProps {
  product: {
    id: number;
    name: string;
    sku: string;
    price: string;
    regular_price: string;
    stock_quantity: number | null;
    stock_status: string;
    images: ProductImage[];
    slug: string;
    min_qty?: number;
  };
  waMsg: string;
}

export default function ProductDetailActions({ product, waMsg }: ProductDetailActionsProps) {
  const { addItem } = useCart();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [stockMsg, setStockMsg] = useState('');
  const [showMobileBar, setShowMobileBar] = useState(false);
  const addToCartRef = useRef<HTMLDivElement>(null);

  // ★ IntersectionObserver: show mobile bottom bar when add-to-cart button scrolls out of view
  useEffect(() => {
    if (!addToCartRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMobileBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(addToCartRef.current);
    return () => observer.disconnect();
  }, [product.id, isLoggedIn]);

  // ★ Stock logic (aligned with old site)
  const inStock = (product.stock_status || '') === 'instock';
  const isActuallyOutOfStock = inStock && product.stock_quantity !== null && product.stock_quantity !== undefined && parseInt(String(product.stock_quantity)) <= 0;
  const effectiveInStock = inStock && !isActuallyOutOfStock;

  // ★ minQty / maxQty
  const maxQty = (product.stock_quantity !== null && product.stock_quantity !== undefined)
    ? parseInt(String(product.stock_quantity)) || 999
    : 999;
  const minQty = (product && product.min_qty) ? Math.max(1, product.min_qty || 1) : 1;

  // ★ Reset qty when product changes
  useEffect(() => {
    const mq = minQty > 1 ? minQty : 1;
    setQty(mq);
  }, [product.id, minQty]);

  const hasDiscount = parseFloat(product.regular_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.regular_price)) * 100)
    : 0;

  function handleAdd() {
    if (!product) return;

    // ★ Clamp qty to maxQty
    const requestQty = Math.min(qty, maxQty);
    if (requestQty < qty) {
      setStockMsg(`Solo hay ${maxQty} unidades disponibles`);
      setTimeout(() => setStockMsg(''), 3000);
      setQty(requestQty);
    }

    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.src || '',
      qty: requestQty,
      stock_quantity: product.stock_quantity ?? null,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <>
      {authLoading ? (
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-2xl mb-6" />
          <div className="h-6 bg-gray-200 rounded w-32 mb-5" />
          <div className="h-12 bg-gray-200 rounded-xl w-full mb-6" />
        </div>
      ) : isLoggedIn ? (
        /* Logged in: show price + add to cart (aligned with old site) */
        <>
          {/* ★ Sticky zone start */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {/* Price block */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-6">
              <div className="flex items-end gap-3 flex-wrap">
                <PriceOrLoginPrompt price={product.price || '0'} regularPrice={product.regular_price} />
                {hasDiscount && (
                  <span className="text-xl text-gray-300 line-through mb-0.5">
                    €{parseFloat(product.regular_price).toFixed(2)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#ea580c]/10 text-[#ea580c] text-sm font-bold px-3 py-1 rounded-full">
                  Ahorras €{(parseFloat(product.regular_price) - parseFloat(product.price)).toFixed(2)} ({discountPct}% dto.)
                </div>
              )}
            </div>

            {/* Stock indicator — only status, NOT exact quantity (B2B strategy) */}
            <div className="flex items-center gap-2 mb-5">
              {effectiveInStock ? (
                <>
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                  <span className="text-green-700 font-semibold text-sm">En stock</span>
                  {product.stock_quantity != null && parseInt(String(product.stock_quantity)) <= 1 && (
                    <span className="text-sm font-medium text-amber-600">
                      · ¡Última unidad!
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                  <span className="text-red-600 font-semibold text-sm">{isActuallyOutOfStock ? 'Agotado' : 'Sin stock'}</span>
                  <span className="text-gray-400 text-sm">· Consultar disponibilidad por WhatsApp</span>
                </>
              )}
            </div>

            {/* Quantity + Add to cart */}
            {effectiveInStock && (
              <div className="mb-5" ref={addToCartRef}>
                {/* ★ Stock message */}
                {stockMsg && (
                  <div className="flex items-center gap-1.5 mb-2 text-amber-600 text-xs font-medium bg-amber-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={13} />
                    {stockMsg}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button
                      onClick={() => setQty(Math.max(minQty, qty - 1))}
                      disabled={qty <= minQty}
                      className={`w-11 h-12 text-lg font-bold flex items-center justify-center transition ${
                        qty <= minQty
                          ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      type="button"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={qty}
                      onChange={e => {
                        const val = parseInt(e.target.value) || minQty;
                        const clamped = Math.max(minQty, Math.min(val, maxQty));
                        setQty(clamped);
                        if (val < minQty) {
                          setStockMsg(`Mínimo ${minQty} unidades`);
                          setTimeout(() => setStockMsg(''), 2500);
                        } else if (val > maxQty) {
                          setStockMsg(`Máximo ${maxQty} unidades disponibles`);
                          setTimeout(() => setStockMsg(''), 2500);
                        }
                      }}
                      className="w-14 text-center font-black text-lg border-x border-gray-100 h-12 focus:outline-none"
                      min={minQty}
                      max={maxQty >= 999 ? undefined : maxQty}
                    />
                    <button
                      onClick={() => {
                        if (qty >= maxQty) {
                          setStockMsg(`Máximo ${maxQty} unidades`);
                          setTimeout(() => setStockMsg(''), 2000);
                          return;
                        }
                        setQty(qty + 1);
                      }}
                      disabled={qty >= maxQty}
                      className={`w-11 h-12 text-lg font-bold flex items-center justify-center transition ${
                        qty >= maxQty
                          ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      type="button"
                    >
                      +
                    </button>
                  </div>

                  {/* ★ minQty hint */}
                  {minQty > 1 && (
                    <p className="text-xs text-orange-600">
                      Mínimo {minQty} unidades
                    </p>
                  )}

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
                      <><Check size={18} /> Añadido al carrito</>
                    ) : (
                      <><ShoppingCart size={18} /> Añadir al carrito</>
                    )}
                  </button>
                </div>
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
              {effectiveInStock ? 'Consultar por WhatsApp' : 'Consultar disponibilidad'}
            </a>
          </div>
          {/* ★ Sticky zone end */}
        </>
      ) : (
        /* Guest: "Precio exclusivo B2B" block (aligned with old site) */
        <>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 p-5 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#ea580c]/10 rounded-xl flex items-center justify-center shrink-0">
                <Lock size={24} className="text-[#ea580c]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Precio exclusivo B2B</p>
                <p className="text-gray-500 text-sm">Solo visible para clientes registrados y aprobados</p>
              </div>
            </div>
            <Link
              href="/mi-cuenta?register=1"
              className="w-full mt-3 bg-[#ea580c] hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              <Lock size={18} /> Registrarse para ver precios
            </Link>
            <p className="text-xs text-gray-400 text-center mt-2">
              Solicitud gratuita · Aprobación en menos de 24h laborables
            </p>
          </div>

          {/* Stock indicator (always visible for guests too) */}
          <div className="flex items-center gap-2 mb-5">
            {effectiveInStock ? (
              <span className="text-green-700 font-semibold text-sm">En stock</span>
            ) : (
              <span className="text-red-600 font-semibold text-sm">{isActuallyOutOfStock ? 'Agotado' : 'Sin stock'}</span>
            )}
          </div>

          {/* WhatsApp CTA (always visible for guests) */}
          <a
            href={`https://wa.me/34688560560?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#25d366] text-[#128c7e] font-semibold hover:bg-[#25d366]/5 transition mb-6 text-sm"
          >
            <MessageCircle size={18} />
            {effectiveInStock ? 'Consultar por WhatsApp' : 'Consultar disponibilidad'}
          </a>
        </>
      )}

      {/* ★ Mobile bottom bar: shown when add-to-cart button scrolls out of view (old site) */}
      {showMobileBar && isLoggedIn && effectiveInStock && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
              <PriceOrLoginPrompt price={product.price || '0'} regularPrice={product.regular_price} />
            </div>
            <button
              onClick={handleAdd}
              className={`shrink-0 px-6 h-11 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg'
              }`}
            >
              {added ? (
                <><Check size={16} /> ✓</>
              ) : (
                <><ShoppingCart size={16} /> Añadir</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
