"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/api";
import { getProductImage } from "@/lib/api";
import ProductCard from "./ProductCard";
import { useRef } from "react";

function useCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    if (ref.current) {
      const cardWidth = (ref.current.firstElementChild as HTMLElement | null)?.offsetWidth || 180;
      ref.current.scrollBy({ left: dir * (cardWidth + 16) * 3, behavior: "smooth" });
    }
  };
  return { ref, scroll };
}

export function ProductsCarousel({ title, products, viewAllLink, icon }: { title: string; products: Product[]; viewAllLink?: string; icon?: React.ReactNode }) {
  const { ref, scroll } = useCarousel();

  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            className="p-2 rounded-full border border-gray-200 hover:border-[#2563eb] hover:text-[#2563eb] transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-2 rounded-full border border-gray-200 hover:border-[#2563eb] hover:text-[#2563eb] transition"
          >
            <ChevronRight size={18} />
          </button>
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-sm font-medium text-[#2563eb] hover:underline ml-2"
            >
              Ver todo →
            </Link>
          )}
        </div>
      </div>

      <div
        ref={ref}
        className="carousel-container flex gap-4 px-4 max-w-7xl mx-auto pb-4"
        style={{ overflowX: "auto", paddingBottom: "16px" }}
      >
        {products.map(p => (
          <ProductCard key={p.id} product={p} compact />
        ))}
      </div>
    </section>
  );
}
