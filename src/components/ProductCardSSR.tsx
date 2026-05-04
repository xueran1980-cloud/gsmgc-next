/**
 * ProductCardSSR — 纯服务端渲染产品卡片（无交互）
 * 用作 SSR 首屏占位，客户端水合后被 TiendaClient 的 ProductCard 替换
 */
import type { Product } from '@/lib/api';
import { formatPrice } from '@/lib/display-formatter';

export default function ProductCardSSR({ product }: { product: Product }) {
  const imgUrl = product.images?.[0]?.src || '/product-thumb-placeholder.svg';
  const inStock = product.stock_status === 'instock' && (product.stock_quantity || 0) > 0;

  return (
    <a
      href={`/producto/${product.id}/${product.slug || ''}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col h-full"
    >
      {/* 图片 */}
      <div className="rounded-lg h-40 flex items-center justify-center mb-3 overflow-hidden bg-gray-50">
        <img
          src={imgUrl}
          alt={product.name}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
          width="300"
          height="300"
        />
      </div>

      {/* 库存标签 */}
      {!inStock && (
        <span className="text-[10px] font-bold text-red-500 mb-1">Agotado</span>
      )}

      {/* 产品名 */}
      <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">
        {product.name}
      </h3>

      {/* SKU */}
      {product.sku && (
        <span className="text-[10px] text-gray-400 mb-2">SKU: {product.sku}</span>
      )}

      {/* 价格（未登录显示 base 和 IGIC） */}
      <div className="mt-auto pt-2 border-t border-gray-50">
        {product.price ? (
          <>
            <span className="font-black text-[#2563eb] text-sm">{formatPrice(product.price)}</span>
            <div className="text-xs text-gray-500">IGIC incl. {formatPrice(parseFloat(product.price) * 1.07)}</div>
          </>
        ) : (
          <span className="text-sm font-bold text-[#ea580c]">Ver precio</span>
        )}
      </div>
    </a>
  );
}
