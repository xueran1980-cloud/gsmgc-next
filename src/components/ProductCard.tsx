"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Eye, Lock, Tag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/lib/api";
import { getProductImage } from "@/lib/api";

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
  if (stock_quantity !== null && stock_quantity !== undefined && stock_quantity <= 5) {
    return (
      <span className="absolute top-2 right-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
        ¡Última!
      </span>
    );
  }
  return null;
}

export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

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
      stock: product.stock_quantity || 0,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const inStock = product.stock_status === "instock";
  const stockQty = product.stock_quantity;
  const hasDiscount = parseFloat(product.regular_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.regular_price)) * 100)
    : 0;
  const imgUrl = getProductImage(product);

  // ── compact variant (for carousels) ──
  if (compact) {
    return (
      <Link
        href={getProductUrl(product)}
        className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-3 group relative"
      >
        <DiscountBadge regular_price={product.regular_price} price={product.price} />
        <div className="bg-gray-50 rounded-lg h-24 flex items-center justify-center mb-3 overflow-hidden">
          {imgUrl && !imgUrl.includes("placeholder") ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
              <img
                src={imgUrl}
                alt={product.name}
                className={`max-h-full max-w-full object-contain group-hover:scale-105 transition-transform ${imgLoaded ? "" : "opacity-0"}`}
                loading="lazy"
                decoding="async"
                width={300}
                height={300}
                onLoad={() => setImgLoaded(true)}
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
          {isAuthenticated ? (
            <>
              <div>
                <span className="text-[#2563eb] font-black text-sm">
                  €{parseFloat(product.price || "0").toFixed(2)}
                </span>
                {hasDiscount && (
                  <div className="text-[10px] text-gray-400 line-through leading-none">
                    €{parseFloat(product.regular_price).toFixed(2)}
                  </div>
                )}
              </div>
              {inStock ? (
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
              ) : (
                <span className="text-[10px] text-red-400 font-semibold">Sin stock</span>
              )}
            </>
          ) : (
            <Link
              href="/mi-cuenta?register=1"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[#2563eb] font-semibold text-xs hover:text-[#1d4ed8] transition"
            >
              <Tag size={12} />
              Ver precio
            </Link>
          )}
        </div>
      </Link>
    );
  }

  // ── standard card ──
  return (
    <Link
      href={getProductUrl(product)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all p-4 group flex flex-col relative overflow-hidden"
    >
      {/* Badges */}
      <DiscountBadge regular_price={product.regular_price} price={product.price} />
      <StockBadge stock_status={product.stock_status} stock_quantity={stockQty} />

      {/* Out-of-stock overlay */}
      {!inStock && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
          <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
            Sin stock
          </span>
        </div>
      )}

      {/* Image */}
      <div className="bg-gray-50 rounded-xl h-40 flex items-center justify-center mb-4 overflow-hidden relative">
        {imgUrl && !imgUrl.includes("placeholder") ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <img
              src={imgUrl}
              alt={product.name}
              className={`max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 ${imgLoaded ? "" : "opacity-0"}`}
              loading="lazy"
              decoding="async"
              width={300}
              height={300}
              onLoad={() => setImgLoaded(true)}
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
        {inStock && stockQty !== null && stockQty !== undefined && stockQty > 5 && (
          <div className="text-[11px] text-green-600 font-medium mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
            {stockQty} disponibles
          </div>
        )}
      </div>

      {/* Price + CTA */}
      <div className="mt-3 pt-3 border-t border-gray-50">
        {isAuthenticated ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <div className="text-[#2563eb] font-black text-lg leading-none">
                €{parseFloat(product.price || "0").toFixed(2)}
              </div>
              {hasDiscount ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400 line-through">
                    €{parseFloat(product.regular_price).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#ea580c] font-bold">-{discountPct}%</span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 mt-0.5">+ IVA/IGIC</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAdd}
                disabled={!inStock}
                className={`rounded-xl p-2.5 transition font-bold text-sm ${
                  added
                    ? "bg-green-500 text-white shadow-md"
                    : inStock
                    ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md hover:shadow-lg"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
                title={inStock ? "Añadir al carrito" : "Sin stock"}
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
          </div>
        ) : (
          /* 未登录：显示注册提示 — 对齐现站 */
          <div>
            <Link
              href="/mi-cuenta?register=1"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[#2563eb] font-semibold text-sm hover:text-[#1d4ed8] transition mb-1"
            >
              <Lock size={14} />
              Registrate para ver precio
            </Link>
            <div className="text-[11px] text-gray-400">Precio exclusivo B2B</div>
            <Link
              href="/mi-cuenta?register=1"
              onClick={(e) => e.stopPropagation()}
              className="inline-block mt-1.5 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline transition"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </Link>
  );
}
