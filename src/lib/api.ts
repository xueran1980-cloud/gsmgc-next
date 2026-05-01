// GSMGC Next.js - 数据获取层
// SSG/ISR 页面在服务端调用，CSR 页面通过 smartFetch 调用

const PRODUCTS_API = "https://api.gsmgc.es/wp-json/gsmgc/v1/products-raw";

// Export for client-side usage
export { PRODUCTS_API };

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
  count?: number;
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

export async function fetchProducts(): Promise<Product[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const res = await fetch(PRODUCTS_API, {
      next: { revalidate: 86400 }, // ISR 24h
      headers: {
        // Critical: CF Bot Fight Mode blocks requests without User-Agent (error 1010)
        "User-Agent": "GSMGC-Bot/1.0",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[fetchProducts] API returned ${res.status}, returning empty array`);
      return [];
    }
    const data: ProductsRawResponse = await res.json();
    return data.products;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[fetchProducts] Fetch aborted after 15s timeout, returning empty array');
    } else {
      console.warn(`[fetchProducts] Fetch failed:`, err);
    }
    return []; // 返回空数组，build 不中断，ISR 会在运行时重新拉取
  } finally {
    clearTimeout(timeout);
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

// ---------- 分类数据（与旧站 wc_categories.json 一致） ----------

const CATEGORIES_URL = "/wc_categories.json";

// Export for client-side usage
export { CATEGORIES_URL };

// ---------- 客户端数据获取 ----------

// Client-side fetch for TiendaClient (same as old site: read from local JSON)
let _productsCache: Product[] | null = null;
let _categoriesCache: ProductCategory[] | null = null;

export async function clientFetchProducts(): Promise<Product[]> {
  if (_productsCache) return _productsCache;
  try {
    const res = await fetch('/wc_products.json');
    if (!res.ok) {
      console.warn(`[clientFetchProducts] API returned ${res.status}`);
      return [];
    }
    const data: Product[] = await res.json();
    // Fix image URLs: replace gsmgc.es with api.gsmgc.es (images are on WP server)
    for (const p of data) {
      if (p.images) {
        for (const img of p.images) {
          if (img.src && img.src.startsWith('https://gsmgc.es/')) {
            img.src = img.src.replace('https://gsmgc.es/', 'https://api.gsmgc.es/');
          }
        }
      }
    }
    _productsCache = data;
    return data;
  } catch (err) {
    console.warn(`[clientFetchProducts] fetch failed:`, err);
    return [];
  }
}

export async function clientFetchCategories(): Promise<ProductCategory[]> {
  if (_categoriesCache) return _categoriesCache;
  try {
    const res = await fetch('/wc_categories.json');
    if (!res.ok) {
      console.warn(`[clientFetchCategories] API returned ${res.status}`);
      return [];
    }
    const data: ProductCategory[] = await res.json();
    _categoriesCache = data;
    return data;
  } catch (err) {
    console.warn(`[clientFetchCategories] fetch failed:`, err);
    return [];
  }
}

// ---------- 服务端数据获取（SSG/ISR） ----------

export async function fetchCategories(): Promise<ProductCategory[]> {
  const res = await fetch(CATEGORIES_URL, {
    next: { revalidate: 86400 }, // ISR 24h，与 products 同步
    headers: {
      "User-Agent": "GSMGC-Bot/1.0",
    },
  });
  if (!res.ok) {
    console.warn(`[fetchCategories] API returned ${res.status}, returning empty array`);
    return [];
  }
  const data: ProductCategory[] = await res.json();
  return data;
}
