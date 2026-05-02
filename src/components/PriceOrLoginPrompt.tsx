"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";
import { formatSpanishPrice, calcIGIC, type DisplayPrice } from "@/lib/display-formatter";

/**
 * PriceOrLoginPrompt — 统一价格/登录提示组件
 *
 * ★ 所有价格渲染必须经过此组件（或 formatDisplayPrice）
 * ★ WC theme 对齐：西班牙语格式 + IGIC incluido
 */
export function PriceOrLoginPrompt({
  price,
  regularPrice,
  compact = false,
}: {
  price: string;
  regularPrice?: string;
  compact?: boolean;
}) {
  const { isLoggedIn, loading } = useAuth();

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

  // ★ 登录用户：使用 formatter
  const base = parseFloat(price || "0");
  const igic = calcIGIC(base);
  const regular = regularPrice ? parseFloat(regularPrice) : 0;
  const hasDiscount = regular > 0 && base > 0 && regular > base;

  const sizeClass = compact ? 'text-xs' : 'text-sm';

  return (
    <div>
      <span className={`font-black text-[#2563eb] ${sizeClass}`}>
        {formatSpanishPrice(base)}
      </span>
      {hasDiscount && (
        <span className="text-[10px] text-gray-400 line-through ml-1">
          {formatSpanishPrice(regular)}
        </span>
      )}
      <div className={`${compact ? 'text-[9px]' : 'text-xs'} text-gray-500`}>
        IGIC incl. {formatSpanishPrice(igic)}
      </div>
    </div>
  );
}
