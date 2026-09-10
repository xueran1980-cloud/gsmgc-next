"use client";

import Link from "next/link";
import type { ProductCategory } from "@/lib/api";
import { getBrandCategories, LEGACY_BRAND_SLUGS } from '@/lib/brandCategory';

// 兜底：当 categories 数据未加载时显示（迁移前白名单）
const FALLBACK_BRANDS = Array.from(LEGACY_BRAND_SLUGS)
  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  .map(s => s.replace(/-/g, ' '));

interface BrandsSectionProps {
  categories?: ProductCategory[];
  /** Marcas 父分类 id（来自 categories-raw）。null = 尚未迁移，回退白名单。 */
  marcasParentId?: number | null;
}

export default function BrandsSection({ categories, marcasParentId = null }: BrandsSectionProps) {
  const brandCats = getBrandCategories(categories, marcasParentId);
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
