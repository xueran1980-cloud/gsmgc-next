import Link from "next/link";
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

// Phase 1: ProductCard is a pure display component (no cart interaction)
export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const inStock = product.stock_status === "instock";
  const hasDiscount = parseFloat(product.regular_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.regular_price)) * 100)
    : 0;
  const imgUrl = getProductImage(product);

  // Compact variant (for carousels) - Server Component
  if (compact) {
    return (
      <Link
        href={getProductUrl(product)}
        className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-3 group relative"
      >
        <DiscountBadge regular_price={product.regular_price} price={product.price} />
        <div className="bg-gray-50 rounded-lg h-24 flex items-center justify-center mb-3 overflow-hidden">
          <img
            src={imgUrl}
            alt={product.name}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
            loading="lazy"
            width={300}
            height={300}
          />
        </div>
        <h3 className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1.5 group-hover:text-[#2563eb] transition">
          {product.name}
        </h3>
        {product.sku && (
          <div className="text-[10px] text-gray-400 mb-1.5 font-mono">SKU: {product.sku}</div>
        )}
        <div className="flex items-center justify-between">
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
          {!inStock && (
            <span className="text-[10px] text-red-400 font-semibold">Sin stock</span>
          )}
        </div>
      </Link>
    );
  }

  // Standard card - Server Component (pure display)
  return (
    <Link
      href={getProductUrl(product)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all p-4 group flex flex-col relative overflow-hidden"
    >
      {/* Badges */}
      <DiscountBadge regular_price={product.regular_price} price={product.price} />

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
        <img
          src={imgUrl}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          width={300}
          height={300}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 group-hover:text-[#2563eb] transition text-sm">
          {product.name}
        </h3>
        {product.sku && (
          <div className="text-[11px] text-gray-400 font-mono mb-2">SKU: {product.sku}</div>
        )}
        {inStock && product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity > 5 && (
          <div className="text-[11px] text-green-600 font-medium mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
            {product.stock_quantity} disponibles
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-50">
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
      </div>
    </Link>
  );
}
