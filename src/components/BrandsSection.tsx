"use client";

import Link from "next/link";
import type { ProductCategory } from "@/lib/api";
import { BRAND_CATEGORY_NAMES, EXCLUDED_CATEGORY_NAMES, PRODUCT_TYPE_CATEGORY_NAMES } from '@/config/category-config';

// ★ SINGLE SOURCE: 品牌 = product_cat 中的品牌节点（不是独立 taxonomy）
//   所有分类数据来自 WooCommerce categories API

// 兜底：当 categories 数据未加载时显示
const FALLBACK_BRANDS = Array.from(BRAND_CATEGORY_NAMES).map(n =>
  n.charAt(0) + n.slice(1).toLowerCase()
).filter(b => b.length > 1);

interface BrandsSectionProps {
  categories?: ProductCategory[];
}

function filterBrandCategories(categories: ProductCategory[]) {
  if (!categories || categories.length === 0) return [];
  return [...categories]
    .filter(c => {
      if (c.parent !== 0 || c.count == null || c.count <= 0) return false;
      const n = (c.name || '').trim().toUpperCase();
      if (EXCLUDED_CATEGORY_NAMES.has(c.name) || EXCLUDED_CATEGORY_NAMES.has(n)) return false;
      if (BRAND_CATEGORY_NAMES.has(n)) return true;
      // 排除已知产品类型分类
      if (PRODUCT_TYPE_CATEGORY_NAMES.has((c.name || '').toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

export default function BrandsSection({ categories }: BrandsSectionProps) {
  const brandCats = filterBrandCategories(categories || []);
  const brands = brandCats.length > 0 ? brandCats : FALLBACK_BRANDS;

  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-gray-900 mb-6">Marcas</h2>
        <div className="flex flex-wrap gap-3">
          {brands.map((brand) => {
            // ★ 品牌 = product_cat 节点
            //   slug 来自 WooCommerce product_cat.slug，不是独立 brand 字段
            const slug = typeof brand === 'string'
              ? brand.toLowerCase()
              : (brand.slug || brand.name || '').toLowerCase();
            const label = typeof brand === 'string' ? brand : brand.name;
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
