"use client";

import Link from "next/link";
import { useWpLoggedIn } from "@/hooks/useWpLoggedIn";
import { Lock } from "lucide-react";

const IGIC_RATE = 0.07;

export function PriceOrLoginPrompt({
  price,
  regularPrice,
  compact = false,
}: {
  price: string;
  regularPrice?: string;
  compact?: boolean;
}) {
  const isLoggedIn = useWpLoggedIn();

  if (isLoggedIn === "loading") {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-16 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-12" />
      </div>
    );
  }

  if (isLoggedIn !== true) {
    // 游客视图 — 1:1 对齐现站 ProductCard.jsx
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
        <Link
          href="/mi-cuenta?register=1"
          className="text-[#2563eb] font-semibold text-sm hover:underline"
        >
          <Lock size={15} className="inline mr-1" />
          Registrate para ver precio
        </Link>
      </div>
    );
  }

  // 登录用户视图 — 1:1 对齐现站 PriceWithIGIC.jsx
  const base = parseFloat(price || "0");
  const igicTotal = base * (1 + IGIC_RATE);
  const hasDiscount =
    regularPrice && parseFloat(regularPrice) > base;

  return (
    <div>
      <span className="font-black text-[#2563eb]">
        {base.toFixed(2)} €
      </span>
      {hasDiscount && (
        <span className="text-[10px] text-gray-400 line-through ml-1">
          €{parseFloat(regularPrice).toFixed(2)}
        </span>
      )}
      <div className="text-xs text-gray-500">
        <span className="font-medium">IGIC</span> {igicTotal.toFixed(2)} €
      </div>
    </div>
  );
}
