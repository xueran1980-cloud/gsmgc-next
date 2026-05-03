"use client";

import Link from "next/link";
import type { ProductCategory } from "@/lib/api";
import { BRAND_CATEGORY_NAMES, EXCLUDED_CATEGORY_NAMES } from '@/config/category-config';

// 兜底：当 categories 数据未加载时显示
const FALLBACK_BRANDS = Array.from(BRAND_CATEGORY_NAMES)
  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  .map(s => s.replace(/-/g, ' '));

interface BrandsSectionProps {
  categories?: ProductCategory[];
}

function filterBrandCategories(categories: ProductCategory[]) {
  if (!categories || categories.length === 0) return [];
  return [...categories]
    .filter(c => {
      if ((c.count ?? 0) <= 0) return false;
      const slug = (c.slug || '').toLowerCase();
      if (EXCLUDED_CATEGORY_NAMES.has(slug)) return false;
      return BRAND_CATEGORY_NAMES.has(slug);
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

export default function BrandsSection({ categories }: BrandsSectionProps) {
  const brandCats = filterBrandCategories(categories || []);
  const brands = brandCats.length > 0 ? brandCats : null;

  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-gray-900 mb-6">Marcas</h2>
        <div className="flex flex-wrap gap-3">
          {(brands || FALLBACK_BRANDS.map(b => ({ name: b, slug: b.toLowerCase().replace(/ /g, '-') }))).map((brand: any) => {
            const slug = (brand.slug || '').toLowerCase();
            const label = brand.name;
            return (
              <Link
                key={slug}
                href={`/tienda?category=${encodeURIComponent(slug)}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb] hover:bg-blue-50 transition"
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
