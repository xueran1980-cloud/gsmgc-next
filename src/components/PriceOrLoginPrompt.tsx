"use client";

import Link from "next/link";
import { useWpLoggedIn } from "@/hooks/useWpLoggedIn";
import { LogIn } from "lucide-react";

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
    // 游客视图
    if (compact) {
      return (
        <div className="text-[10px] text-gray-400 italic">
          <LogIn size={10} className="inline mr-0.5" />
          Regístrese para ver precio
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
          Registrarse para ver precio
        </Link>
      </div>
    );
  }

  // 登录用户视图
  const hasDiscount =
    regularPrice && parseFloat(regularPrice) > parseFloat(price);
  return (
    <div>
      <span className="text-[#2563eb] font-black">
        €{parseFloat(price || "0").toFixed(2)}
      </span>
      {hasDiscount && (
        <span className="text-[10px] text-gray-400 line-through ml-1">
          €{parseFloat(regularPrice).toFixed(2)}
        </span>
      )}
    </div>
  );
}
