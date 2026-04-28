import type { Metadata } from "next";
import { fetchProducts, getCategoriesFromProducts } from "@/lib/api";
import Hero from "@/components/Hero";
import { ProductsCarousel } from "@/components/ProductsCarousel";
import CategoriesSection from "@/components/CategoriesSection";
import BrandsSection from "@/components/BrandsSection";
import StatsSection from "@/components/StatsSection";

// Dynamic rendering: fetch products at request time, not build time.
// CF Bot Fight Mode blocks Vercel build IPs (error 1010).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: { canonical: "https://gsmgc.es" },
};

export default async function HomePage() {
  const products = await fetchProducts();

  // Compute category counts from products
  const categoryMap = new Map<number, { id: number; name: string; slug: string; parent: number; count: number }>();
  for (const product of products) {
    if (!product.categories) continue;
    for (const cat of product.categories) {
      const existing = categoryMap.get(cat.id);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(cat.id, { ...cat, count: 1 });
      }
    }
  }
  const categoriesWithCounts = Array.from(categoryMap.values())
    .sort((a, b) => b.count - a.count);

  // Select products for sections
  const inStockProducts = products.filter(p => p.stock_status === "instock" && p.images?.length > 0);
  
  // Latest products (by date_created, newest first)
  const latest = [...inStockProducts]
    .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
    .slice(0, 20);

  // Featured products (best sellers by total_sales)
  const featured = [...inStockProducts]
    .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
    .slice(0, 20);

  // Hero products (3 with images)
  const heroProducts = inStockProducts.slice(0, 3);

  return (
    <>
      <Hero featuredProducts={heroProducts} />
      <ProductsCarousel
        title="Novedades"
        icon={<span className="text-xl">✨</span>}
        products={latest}
        viewAllLink="/tienda?orderby=date"
      />
      <CategoriesSection categories={categoriesWithCounts} />
      <ProductsCarousel
        title="Más vendidos"
        icon={<span className="text-xl">🔥</span>}
        products={featured}
        viewAllLink="/tienda"
      />
      <BrandsSection />
      <StatsSection />
    </>
  );
}
