"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePrices } from "@/context/PriceContext";
import { Lock } from "lucide-react";
import { formatPrice, calcIGIC } from "@/lib/display-formatter";

export function PriceOrLoginPrompt({
  price,
  regularPrice,
  productId,
  compact = false,
}: {
  /** 兼容旧调用：SSR 骨架传 0/空；登录价格以 productId 为准 */
  price?: string;
  regularPrice?: string;
  /** ISSUE-2026-002 Phase 2: 通过 productId 从 products-prices 取真实价格 */
  productId?: number;
  compact?: boolean;
}) {
  const { isLoggedIn, loading } = useAuth();
  const { getPrice, ensurePrices, denied } = usePrices();

  // 登录后确保拉取该产品价格（GATE 2: 唯一来源 products-prices）
  useEffect(() => {
    if (isLoggedIn && productId) {
      ensurePrices([productId]);
    }
  }, [isLoggedIn, productId, ensurePrices]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={`bg-gray-200 rounded ${compact ? 'h-3 w-12' : 'h-4 w-16'} mb-1`} />
        <div className={`bg-gray-200 rounded ${compact ? 'h-2 w-10' : 'h-3 w-12'}`} />
      </div>
    );
  }

  if (!isLoggedIn) {
    if (compact) {
      return (
        <div className="text-[10px] text-gray-400 italic">
          <Lock size={9} className="inline mr-0.5" />Ver precio
        </div>
      );
    }
    return (
      <div>
        <div className="text-sm text-gray-500 mb-1">Precio exclusivo B2B</div>
        <Link href="/mi-cuenta" className="text-[#2563eb] font-semibold text-sm hover:underline">
          <Lock size={15} className="inline mr-1" />Registrate para ver precio
        </Link>
      </div>
    );
  }

  // 已登录：价格来自 products-prices（productId 优先；无 productId 时回退旧 prop）
  const priceInfo = productId ? getPrice(productId) : null;

  // ⭐ 已登录 + 有 productId + 价格未就绪（products-prices 拉取中）→ 骨架占位
  //   （避免回退显示 €0.00 / 白条——登录客户 1-2 秒内看到假价格是 UX 缺陷）
  if (isLoggedIn && productId && !priceInfo) {
    // 已确认无权（401/403）→ 显示 Ver precio，而非永久骨架
    if (denied) {
      return (
        <div className={compact ? "text-[10px] text-gray-400 italic" : "text-sm text-gray-500"}>
          <Lock size={9} className="inline mr-0.5" />Ver precio
        </div>
      );
    }
    return (
      <div className="animate-pulse">
        <div className={`bg-gray-200 rounded ${compact ? 'h-3 w-12' : 'h-4 w-16'} mb-1`} />
        <div className={`bg-gray-200 rounded ${compact ? 'h-2 w-10' : 'h-3 w-12'}`} />
      </div>
    );
  }

  const base = priceInfo ? parseFloat(priceInfo.price) : parseFloat(price || "0");
  const igic = calcIGIC(base);
  const regularVal = priceInfo
    ? parseFloat(priceInfo.regular_price)
    : regularPrice ? parseFloat(regularPrice) : 0;
  const hasDiscount = regularVal > 0 && base > 0 && regularVal > base;

  return (
    <div>
      <span className={`font-black text-[#2563eb] ${compact ? 'text-xs' : 'text-sm'}`}>
        {formatPrice(base)}
      </span>
      {hasDiscount && (
        <span className="text-[10px] text-gray-400 line-through ml-1">
          {formatPrice(regularVal)}
        </span>
      )}
      <div className={`${compact ? 'text-[9px]' : 'text-xs'} text-gray-500`}>
        IGIC incl. {formatPrice(igic)}
      </div>
    </div>
  );
}
