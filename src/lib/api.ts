// GSMGC Next.js - 数据获取层
// SSG/ISR 页面在服务端调用，CSR 页面通过 smartFetch 调用

const PRODUCTS_API = "https://api.gsmgc.es/wp-json/gsmgc/v1/products-raw";

// ---------- 类型定义 ----------

export interface ProductImage {
  id: number;
  src: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  short_description: string;
  description: string;
  total_sales: number;
  date_created: string;
  images: ProductImage[];
  categories: ProductCategory[];
  status: string;
  min_qty: number;
}

interface ProductsRawResponse {
  success: boolean;
  count: number;
  cached_at: string;
  products: Product[];
}

// ---------- SSG/ISR 数据获取（Server Component） ----------

// Server-side fetch for SSG/ISR pages
// Note: products-raw is ~3.5MB, exceeds Next.js default 2MB response cache limit.
// We use revalidate: 86400 for ISR (controls HTML page regeneration).
// The JSON response itself won't be cached by Next.js (too large), but CF caches it for 60s.
// Detect Vercel build environment (no NEXT_PUBLIC_ vars available)
const isBuildTime = typeof process.env.VERCEL !== 'undefined' && !process.env.VERCEL_URL;

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(PRODUCTS_API, {
      next: { revalidate: 86400 }, // ISR 24h
      headers: {
        "User-Agent": "GSMGC-Bot/1.0 (SSG Build)",
      },
    });
    if (!res.ok) {
      console.warn(`[fetchProducts] API returned ${res.status}, falling back to empty`);
      return [];
    }
    const data: ProductsRawResponse = await res.json();
    return data.products;
  } catch (err) {
    // Build-time fetch failure (CF Bot Fight Mode etc.) → return empty, pages render at runtime via ISR
    console.warn(`[fetchProducts] Fetch failed during build, falling back to empty:`, err);
    return [];
  }
}

export function getCategoriesFromProducts(products: Product[]): ProductCategory[] {
  const categoryMap = new Map<number, ProductCategory>();
  for (const product of products) {
    if (!product.categories) continue;
    for (const cat of product.categories) {
      if (!categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, cat);
      }
    }
  }
  return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Slug 生成（与 ProductCard 一致） ----------

export function generateSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- 客户端工具函数 ----------

export function getProductImage(product: Product): string {
  return product.images?.[0]?.src || "/product-placeholder.svg";
}

export function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return "0,00";
  return price.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
