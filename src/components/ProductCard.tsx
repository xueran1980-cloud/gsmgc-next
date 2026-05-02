"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Eye, Lock } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/lib/api";
import { formatProduct, type DisplayProduct } from "@/lib/display-formatter";

// ── Badge components ──

function DiscountBadge({ displayPrice }: { displayPrice: DisplayProduct['displayPrice'] }) {
  if (!displayPrice.showOfertaBadge) return null;
  return (
    <span className="absolute top-2 left-2 z-10 bg-[#ea580c] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
      -{displayPrice.discountPct}%
    </span>
  );
}

function StockBadge({ displayStock }: { displayStock: DisplayProduct['displayStock'] }) {
  if (displayStock.status === 'lowstock') {
    return (
      <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
        ¡Última!
      </span>
    );
  }
  return null;
}

// ── ProductCard ──

export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { isLoggedIn, loading: authLoading } = useAuth();

  // ★ 所有展示数据通过 formatter
  const d = formatProduct(product);
  const inStock = d.displayStock.status === 'instock' || d.displayStock.status === 'lowstock';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      regular_price: product.regular_price,
      image: product.images?.[0]?.src || "",
      sku: product.sku,
      stock_quantity: product.stock_quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  // ── Price display (WC theme aligned) ──
  const PriceDisplay = ({ compact: c }: { compact?: boolean }) => {
    const { isLoggedIn, loading } = useAuth();

    if (loading) {
      return (
        <div className="animate-pulse">
          <div className={`bg-gray-200 rounded ${c ? 'h-3 w-12' : 'h-4 w-16'} mb-1`} />
          <div className={`bg-gray-200 rounded ${c ? 'h-2 w-10' : 'h-3 w-12'}`} />
        </div>
      );
    }

    if (!isLoggedIn) {
      // 游客视图 — 1:1 对齐现站
      if (c) {
        return (
          <div className="text-[10px] text-gray-400 italic">
            <Lock size={9} className="inline mr-0.5" />
            Ver precio
          </div>
        );
      }
      return (
        <div>
          <div className="text-sm text-gray-500 mb-1">Precio exclusivo B2B</div>
          <Link href="/mi-cuenta" className="text-[#2563eb] font-semibold text-sm hover:underline">
            <Lock size={15} className="inline mr-1" />
            Registrate para ver precio
          </Link>
        </div>
      );
    }

    // 登录用户视图 — WC theme 风格
    const sizeClass = c ? 'text-xs' : 'text-sm';
    return (
      <div>
        <span className={`font-black text-[#2563eb] ${sizeClass}`}>
          {d.displayPrice.baseFormatted}
        </span>
        {d.displayPrice.hasDiscount && (
          <span className="text-[10px] text-gray-400 line-through ml-1">
            {d.displayPrice.regularFormatted}
          </span>
        )}
        <div className={`${c ? 'text-[9px]' : 'text-xs'} text-gray-500`}>
          IGIC incl. {d.displayPrice.igicFormatted}
        </div>
      </div>
    );
  };

  // ── compact variant (carousels) ──
  if (compact) {
    return (
      <Link
        href={d.productUrl}
        className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-3 group relative"
      >
        <DiscountBadge displayPrice={d.displayPrice} />
        <div className="bg-gray-50 rounded-lg h-24 flex items-center justify-center mb-3 overflow-hidden">
          {d.imageUrl && !d.imageUrl.includes("placeholder") && !imgError ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
              <img
                src={d.imageUrl}
                alt={d.displayTitle.display}
                className={`w-full aspect-square object-cover group-hover:scale-105 transition-transform ${imgLoaded ? "" : "opacity-0"}`}
                loading="eager"
                decoding="async"
                width={300}
                height={300}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <img
              src="/product-thumb-placeholder.svg"
              alt="Sin imagen"
              className="h-16 w-auto object-contain opacity-70"
              aria-hidden="true"
            />
          )}
        </div>
        {/* ★ WC theme: title line-clamp-2 + SEO excerpt below */}
        <h3
          className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 group-hover:text-[#2563eb] transition"
          title={d.displayTitle.truncated ? d.displayTitle.full : undefined}
        >
          {d.displayTitle.display}
        </h3>
        {d.seoExcerpt && (
          <p className="text-[10px] text-gray-400 leading-tight line-clamp-2 mb-1.5">
            {d.seoExcerpt}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto">
          <PriceDisplay compact />
          {inStock && isLoggedIn ? (
            <button
              onClick={handleAdd}
              className={`rounded-lg p-1.5 transition shadow-sm ${
                added
                  ? "bg-green-500 text-white"
                  : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              }`}
              title="Añadir al carrito"
            >
              {added ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <ShoppingCart size={14} />
              )}
            </button>
          ) : !inStock ? (
            <span className="text-[10px] text-red-400 font-semibold">Agotado</span>
          ) : null}
        </div>
      </Link>
    );
  }

  // ── standard card ──
  return (
    <Link
      href={d.productUrl}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all p-4 group flex flex-col h-full relative overflow-hidden"
    >
      {/* Badges */}
      <DiscountBadge displayPrice={d.displayPrice} />
      <StockBadge displayStock={d.displayStock} />

      {/* Out-of-stock overlay */}
      {!inStock && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide animate-pulse">
            Agotado
          </span>
        </div>
      )}

      {/* Image */}
      <div className="bg-gray-50 rounded-xl h-40 flex items-center justify-center mb-4 overflow-hidden relative">
        {d.imageUrl && !d.imageUrl.includes("placeholder") && !imgError ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
              <img
                src={d.imageUrl}
                alt={d.displayTitle.display}
                className={`w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300 ${imgLoaded ? "" : "opacity-0"}`}
              loading="lazy"
              decoding="async"
              width={300}
              height={300}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <img
            src="/product-placeholder.svg"
            alt="Sin imagen"
            className="max-h-full max-w-full object-contain opacity-60"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* ★ WC theme: title + SEO excerpt */}
        <h3
          className="font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 group-hover:text-[#2563eb] transition text-sm"
          title={d.displayTitle.truncated ? d.displayTitle.full : undefined}
        >
          {d.displayTitle.display}
        </h3>
        {/* SEO excerpt (short_description) — WC theme 标准 */}
        {d.seoExcerpt && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-2">
            {d.seoExcerpt}
          </p>
        )}
        {/* SKU — WC theme: 列表页不显示 */}
      </div>

      {/* Price + CTA */}
      <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <div className="flex-1">
          <PriceDisplay />
        </div>

        {/* Actions */}
        {isLoggedIn ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!inStock}
              className={`rounded-xl p-2.5 transition font-bold text-sm ${
                added
                  ? "bg-green-500 text-white shadow-md"
                  : inStock
                  ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md hover:shadow-lg"
                  : "bg-red-100 text-red-400 cursor-not-allowed"
              }`}
              title={inStock ? "Añadir al carrito" : "Agotado"}
            >
              {added ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <ShoppingCart size={16} />
              )}
            </button>
            <Link
              href={d.productUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl p-2.5 border border-gray-200 text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition"
              title="Ver detalles"
            >
              <Eye size={16} />
            </Link>
          </div>
        ) : !inStock ? null : (
          <Link
            href="/mi-cuenta"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded-xl px-3 py-2 bg-[#ea580c] hover:bg-[#d97706] text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <Lock size={13} />
            Registrarse
          </Link>
        )}
      </div>
    </Link>
  );
}
