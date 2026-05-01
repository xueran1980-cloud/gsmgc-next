// GSMGC Next.js - 数据获取层（统一数据源）
// 所有产品数据必须来自 /api/products（Next.js API Route → WC REST API）
// 禁止使用 wc_products.json / products-raw / 任何本地 JSON 缓存

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

// ---------- 服务端获取所有产品（ISR/SSR） ----------
// 统一调用 /api/products（内部代理到 WC REST API）
// cache: 'no-store' 确保每次获取最新数据

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/products`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0' },
    });
    if (!res.ok) {
      console.warn(`[fetchProducts] /api/products returned ${res.status}`);
      return [];
    }
    const data: Product[] = await res.json();
    return data;
  } catch (err) {
    console.warn('[fetchProducts] fetch failed:', err);
    return [];
  }
}

// ---------- 服务端获取单个产品 ----------

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/products?id=${id}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'GSMGC-Next-Proxy/1.0' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[fetchProductById] fetch failed:', err);
    return null;
  }
}

// ---------- 分类数据 ----------

const CATEGORIES_URL = '/api/products';

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

export function getProductImage(product: Product): string {
  return product.images?.[0]?.src || '/product-placeholder.svg';
}

export function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return '0,00';
  return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
