"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Eye, Lock } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/lib/api";
import { getProductImage } from "@/lib/api";
import { PriceOrLoginPrompt } from "./PriceOrLoginPrompt";

function generateSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductUrl(product: Product): string {
  const slug = generateSlug(product.name);
  return slug ? `/producto/${product.id}/${slug}` : `/producto/${product.id}`;
}

function DiscountBadge({ regular_price, price }: { regular_price: string; price: string }) {
  const r = parseFloat(regular_price);
  const p = parseFloat(price);
  if (!r || !p || r <= p) return null;
  const pct = Math.round((1 - p / r) * 100);
  if (pct < 1) return null;
  return (
    <span className="absolute top-2 left-2 z-10 bg-[#ea580c] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
      -{pct}%
    </span>
  );
}

function StockBadge({ stock_status, stock_quantity }: { stock_status: string; stock_quantity: number | null }) {
  if (stock_status !== "instock") return null;
  if (stock_quantity !== null && stock_quantity !== undefined && stock_quantity <= 1) {
    return (
      <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
        ¡Última!
      </span>
    );
  }
  return null;
}

export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { isLoggedIn, loading: authLoading } = useAuth();

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

  const inStock = product.stock_status === "instock";
  const imgUrl = getProductImage(product);

  // ── compact variant (for carousels) ──
  // ★ 移除 authLoading skeleton — 产品卡片应始终可见，价格由 PriceOrLoginPrompt 处理
  return (
      <Link
        href={getProductUrl(product)}
        className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-3 group relative"
      >
        <DiscountBadge regular_price={product.regular_price} price={product.price} />
        <div className="bg-gray-50 rounded-lg h-24 flex items-center justify-center mb-3 overflow-hidden">
          {imgUrl && !imgUrl.includes("placeholder") && !imgError ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
              <img
                src={imgUrl}
                alt={product.name}
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
        <h3 className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1.5 group-hover:text-[#2563eb] transition">
          {product.name}
        </h3>
        {product.sku && (
          <div className="text-[10px] text-gray-400 mb-1.5 font-mono">SKU: {product.sku}</div>
        )}
        <div className="flex items-center justify-between">
          <PriceOrLoginPrompt price={product.price} regularPrice={product.regular_price} compact />
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

  // ── standard card ──
  return (
    <Link
      href={getProductUrl(product)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all p-4 group flex flex-col h-full relative overflow-hidden"
    >
      {/* Badges */}
      <DiscountBadge regular_price={product.regular_price} price={product.price} />
      <StockBadge stock_status={product.stock_status} stock_quantity={product.stock_quantity ?? null} />

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
        {imgUrl && !imgUrl.includes("placeholder") && !imgError ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
              <img
                src={imgUrl}
                alt={product.name}
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
        <h3 className="font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 group-hover:text-[#2563eb] transition text-sm">
          {product.name}
        </h3>
        {product.sku && (
          <div className="text-[11px] text-gray-400 font-mono mb-2">SKU: {product.sku}</div>
        )}
        {/* Stock quantity indicator */}
        {inStock && (product.stock_quantity ?? 0) > 5 && (
          <div className="text-[11px] text-green-600 font-medium mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
            {product.stock_quantity!} disponibles
          </div>
        )}
      </div>

      {/* Price + CTA */}
      <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <div className="flex-1">
          <PriceOrLoginPrompt price={product.price} regularPrice={product.regular_price} />
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
              href={getProductUrl(product)}
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
