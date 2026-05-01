"use client";

import Link from "next/link";
import type { CategoryWithCount } from "@/lib/api";

const EXCLUDED_TOP_CATEGORIES = new Set([
  'sin categorizar', 'uncategorized', 'sin categoria',
  'otros', 'otro', 'misc', 'varios',
]);

const TYPE_KEYWORDS = [
  'ACCESORIOS', 'AUDIO', 'BATERIA', 'CABLE', 'CARGADOR', 'FUNDAS',
  'HERRAMIENTAS', 'PANTALLA', 'PROTECTOR',
];

const KNOWN_BRANDS = new Set([
  'APPLE', 'IPHONE', 'IPAD', 'SAMSUNG', 'XIAOMI', 'HUAWEI', 'OPPO',
  'VIVO', 'ONEPLUS', 'MOTOROLA', 'TCL', 'ZTE', 'ALCATEL', 'NOKIA',
]);

const FALLBACK_BRANDS = [
  "Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Vivo", "OnePlus",
  "Motorola", "TCL", "ZTE", "Alcatel", "Nokia", "Honor", "Lenovo",
  "Realme", "Google", "Sony", "LG", "Asus", "BlackBerry",
];

interface BrandsSectionProps {
  categories?: CategoryWithCount[];
}

function filterBrandCategories(categories: CategoryWithCount[]) {
  if (!categories || categories.length === 0) return [];
  return [...categories]
    .filter(c => {
      if (c.parent !== 0 || c.count <= 0) return false;
      const n = (c.name || '').trim().toUpperCase();
      if (EXCLUDED_TOP_CATEGORIES.has(c.name) || EXCLUDED_TOP_CATEGORIES.has(n)) return false;
      if (KNOWN_BRANDS.has(n)) return true;
      for (const kw of TYPE_KEYWORDS) {
        if (n.includes(kw)) return false;
      }
      return true;
    })
    .sort((a, b) => b.count - a.count);
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
            const slug = typeof brand === 'string' ? brand.toLowerCase() : (brand.slug || brand.name || '').toLowerCase();
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
