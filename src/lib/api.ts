// GSMGC Next.js - 数据获取层
// ★ 数据源：全部 → api.gsmgc.es (WooCommerce)
// ★ 禁止本地缓存、禁止 fs、禁止 SSG
// ★ 服务端：绝对 URL（Node.js fetch 要求）
// ★ 客户端：/api/proxy/ rewrite（浏览器自动带 cookie）

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

// ---------- 产品数据 ----------

const API_PATH = '/wp-json/gsmgc/v1/products-raw';
const API_ORIGIN = 'https://api.gsmgc.es';

function getProductsUrl(): string {
  // 客户端：走 /api/proxy/ rewrite（浏览器请求自动带 cookie）
  // 服务端：用绝对 URL（Node.js fetch 不支持相对路径）
  if (typeof window === 'undefined') {
    return `${API_ORIGIN}${API_PATH}`;
  }
  return `/api/proxy${API_PATH}`;
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(getProductsUrl(), {
      next: { revalidate: 60 },
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[fetchProducts] returned ${res.status}`);
      return [];
    }
    const json = await res.json();
    if (!json.success || !Array.isArray(json.products)) {
      console.warn('[fetchProducts] invalid response format');
      return [];
    }
    return json.products;
  } catch (err) {
    console.warn('[fetchProducts] fetch failed:', err);
    return [];
  }
}

// ---------- 服务端获取单个产品 ----------

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const products = await fetchProducts();
    const product = products.find((p: Product) => String(p.id) === String(id));
    return product || null;
  } catch (err) {
    console.warn('[fetchProductById] failed:', err);
    return null;
  }
}

// ---------- 分类数据 ----------

export async function fetchCategories(): Promise<ProductCategory[]> {
  try {
    const products = await fetchProducts();
    const catMap = new Map<number, ProductCategory>();
    for (const p of products) {
      if (!p.categories) continue;
      for (const c of p.categories) {
        if (!catMap.has(c.id)) catMap.set(c.id, c);
      }
    }
    return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn('[fetchCategories] failed:', err);
    return [];
  }
}

// ---------- Slug 生成（与 ProductCard 一致） ----------

export function generateSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------- 客户端工具函数 ----------

export function getProductImage(product: Product & { image?: ProductImage }): string {
  return (
    product.images?.[0]?.src ||
    product.image?.src ||
    '/product-placeholder.svg'
  );
}

export function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return '0,00';
  return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
