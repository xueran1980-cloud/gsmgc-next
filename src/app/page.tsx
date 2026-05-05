import type { Metadata } from "next";
import { fetchProducts } from "@/lib/api";
import Hero from "@/components/Hero";
import { ProductsCarousel } from "@/components/ProductsCarousel";
import CategoriesSection from "@/components/CategoriesSection";
import BrandsSection from "@/components/BrandsSection";
import StatsSection from "@/components/StatsSection";

// ISR: revalidate every 60s via CF Edge Cache (products-raw TTL = 600s).
// CF Bot Fight Mode is bypassed with User-Agent header in fetchProducts().
export const revalidate = 60;

export const metadata: Metadata = {
  title: "GSMGC - Mayorista Accesorios Móviles Canarias | B2B",
  description: "Mayorista B2B de accesorios para móviles en Canarias. +2.100 productos, envío 24h a Gran Canaria y Tenerife. Precios wholesale.",
  alternates: { canonical: "https://gsmgc.es/" },
  openGraph: {
    title: "GSMGC - Accesorios Móviles Mayorista B2B | Canarias",
    description: "Tu distribuidor de confianza de accesorios móviles en Canarias. Más de 2000 productos para profesionales. Envío rápido a Gran Canaria y Tenerife.",
    type: "website",
    url: "https://gsmgc.es/",
    images: [{ url: "https://gsmgc.es/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GSMGC - Mayorista Accesorios Móviles Canarias",
    description: "Mayorista accesorios móviles Canarias. 2000+ productos B2B. Envío 24h.",
    images: ["https://gsmgc.es/logo.png"],
  },
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

  // Select products for sections（双重检查：stock_status + stock_quantity > 0）
  const inStockProducts = products.filter(p => {
    if (p.stock_status !== "instock") return false;
    if (!p.images || p.images.length === 0) return false;
    // 双检：status=instock 但 quantity=0 可能已被售罄
    if (p.stock_quantity !== null && p.stock_quantity !== undefined && parseInt(String(p.stock_quantity)) <= 0) return false;
    return true;
  });
  
  // Latest products (by date_created, newest first) — 1:1 现站 30个
  const latest = [...inStockProducts]
    .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
    .slice(0, 30);

  // Featured products (best sellers by total_sales) — 1:1 现站 30个
  const featured = [...inStockProducts]
    .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
    .slice(0, 30);

  // Hero products (3 with images)
  const heroProducts = inStockProducts.slice(0, 3);

  // Count unique categories for Hero
  const uniqueCategoryIds = new Set();
  for (const product of products) {
    if (product.categories) {
      for (const cat of product.categories) {
        uniqueCategoryIds.add(cat.id);
      }
    }
  }
  const categoryCount = uniqueCategoryIds.size;
  const productCount = products.length;

  return (
    <>
      {/* JSON-LD: Organization + WebSite SearchAction */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "GSMGC Accesorios Móvil",
            "alternateName": "GSMGC",
            "url": "https://gsmgc.es",
            "logo": "/logo.png",
            "description": "Mayorista B2B de accesorios y repuestos para móviles en Canarias. Más de 2.000 productos con envío en 24h.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "C/ Mayor 45",
              "addressLocality": "Las Palmas de Gran Canaria",
              "postalCode": "35001",
              "addressRegion": "Canarias",
              "addressCountry": "ES",
            },
            "telephone": "+34-688-560-560",
            "areaServed": [
              { "@type": "State", "name": "Canarias", "containsPlace": [
                { "@type": "City", "name": "Gran Canaria" },
                { "@type": "City", "name": "Tenerife" },
              ]},
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+34-688-560-560",
              "contactType": "customer service",
              "availableLanguage": ["Spanish", "English"],
              "areaServed": "ES",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "GSMGC - Accesorios Móviles Mayorista Canarias",
            "url": "https://gsmgc.es",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://gsmgc.es/tienda?search={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      <h1 className="sr-only">Accesorios Móviles Mayorista Canarias - GSMGC Distribuidor B2B</h1>

      <Hero featuredProducts={heroProducts} productCount={productCount} categoryCount={categoryCount} />
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
      <BrandsSection categories={categoriesWithCounts} />
      <StatsSection productCount={productCount} />
    </>
  );
}
