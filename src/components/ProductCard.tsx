"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Eye, Lock } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/lib/api";
import { getDisplayPrice, getProductUrl } from "@/lib/display-formatter";

// ── Badge ──

function DiscountBadge({ dp }: { dp: ReturnType<typeof getDisplayPrice> }) {
  if (!dp.showBadge) return null;
  return (
    <span className="absolute top-2 left-2 z-10 bg-[#ea580c] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
      -{dp.discountPct}%
    </span>
  );
}

function StockBadge({ product }: { product: Product }) {
  if (product.stock_status !== "instock") return null;
  if ((product.stock_quantity ?? 99) <= 1) {
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
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const dp = getDisplayPrice(product.price, product.regular_price);
  const inStock = product.stock_status === "instock";
  const imgUrl = product.images?.[0]?.src || "";
  const productUrl = getProductUrl(product);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id, name: product.name, price: product.price,
      regular_price: product.regular_price, image: imgUrl,
      sku: product.sku, stock_quantity: product.stock_quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  // ── Price (aligned to FINAL MAPPING CONTRACT) ──
  const PriceDisplay = ({ compact: c }: { compact?: boolean }) => {
    const { isLoggedIn, loading } = useAuth();
    if (loading) {
      return <div className={`animate-pulse bg-gray-200 rounded ${c ? 'h-3 w-14' : 'h-4 w-18'}`} />;
    }
    if (!isLoggedIn) {
      if (c) return <div className="text-[10px] text-gray-400 italic"><Lock size={9} className="inline mr-0.5" />Ver precio</div>;
      return (
        <div>
          <div className="text-sm text-gray-500 mb-1">Precio exclusivo B2B</div>
          <a href="/mi-cuenta" onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/mi-cuenta'); }} className="text-[#2563eb] font-semibold text-sm hover:underline cursor-pointer">
            <Lock size={15} className="inline mr-1" />Registrate para ver precio
          </a>
        </div>
      );
    }
    const sizeClass = c ? 'text-xs' : 'text-sm';
    return (
      <div>
        <span className={`font-black text-[#2563eb] ${sizeClass}`}>{dp.base}</span>
        {dp.hasDiscount && <span className="text-[10px] text-gray-400 line-through ml-1">{dp.regular}</span>}
        <div className={`${c ? 'text-[9px]' : 'text-xs'} text-gray-500`}>IGIC incl. {dp.igic}</div>
      </div>
    );
  };

  // ── compact variant ──
  if (compact) {
    return (
      <Link href={productUrl} className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-3 group relative">
        <DiscountBadge dp={dp} />
        <div className="bg-gray-50 rounded-lg h-24 flex items-center justify-center mb-3 overflow-hidden">
          {imgUrl && !imgError ? (
            <img src={imgUrl} alt={product.name}
              className={`w-full aspect-square object-cover group-hover:scale-105 transition-transform ${imgLoaded ? "" : "opacity-0"}`}
              loading="eager" width={300} height={300}
              onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} />
          ) : (
            <img src="/product-thumb-placeholder.svg" alt="Sin imagen" className="h-16 w-auto object-contain opacity-70" />
          )}
        </div>
        {/* ★ RULE 1: title raw, CSS line-clamp-2 only */}
        <h3 className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 group-hover:text-[#2563eb] transition" title={product.name}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-auto">
          <PriceDisplay compact />
          {inStock && isLoggedIn ? (
            <button onClick={handleAdd}
              className={`rounded-lg p-1.5 transition shadow-sm ${added ? "bg-green-500 text-white" : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"}`}>
              {added ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <ShoppingCart size={14} />}
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
    <Link href={productUrl} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all p-4 group flex flex-col h-full relative overflow-hidden">
      <DiscountBadge dp={dp} />
      <StockBadge product={product} />
      {!inStock && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">Agotado</span>
        </div>
      )}
      <div className="bg-gray-50 rounded-xl h-40 flex items-center justify-center mb-4 overflow-hidden relative">
        {imgUrl && !imgError ? (
          <img src={imgUrl} alt={product.name}
            className={`w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300 ${imgLoaded ? "" : "opacity-0"}`}
            loading="lazy" width={300} height={300}
            onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} />
        ) : (
          <img src="/product-placeholder.svg" alt="Sin imagen" className="max-h-full max-w-full object-contain opacity-60" />
        )}
      </div>
      <div className="flex-1 flex flex-col">
        {/* ★ RULE 1: title raw, CSS line-clamp-2 only */}
        <h3 className="font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 group-hover:text-[#2563eb] transition text-sm" title={product.name}>
          {product.name}
        </h3>
      </div>
      <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <div className="flex-1"><PriceDisplay /></div>
        {isLoggedIn ? (
          <div className="flex items-center gap-1.5">
            <button onClick={handleAdd} disabled={!inStock}
              className={`rounded-xl p-2.5 transition font-bold text-sm ${added ? "bg-green-500 text-white shadow-md" : inStock ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md hover:shadow-lg" : "bg-red-100 text-red-400 cursor-not-allowed"}`}>
              {added ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <ShoppingCart size={16} />}
            </button>
            <a
              href={productUrl}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(productUrl); }}
              className="rounded-xl p-2.5 border border-gray-200 text-gray-400 hover:border-[#2563eb] hover:text-[#2563eb] transition cursor-pointer"
              title="Ver detalles"
            ><Eye size={16} /></a>
          </div>
        ) : !inStock ? null : (
          <a
            href="/mi-cuenta"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/mi-cuenta'); }}
            className="shrink-0 rounded-xl px-3 py-2 bg-[#ea580c] hover:bg-[#d97706] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          ><Lock size={13} />Registrarse</a>
        )}
      </div>
    </Link>
  );
}
