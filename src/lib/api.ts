// GSMGC Next.js - 数据获取层
// ★ v5.3: 本地缓存用动态 import('fs')，避免 Turbopack 打包进客户端 bundle

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

// ---------- 数据源策略 ----------

const API_ORIGIN = 'https://api.gsmgc.es';
const PRODUCTS_PATH = '/wp-json/gsmgc/v1/products-raw';
const LOCAL_CACHE_FILE = '.products-cache.json';

const SERVER_HEADERS: HeadersInit = {
  'User-Agent': 'GSMGC-Next-Server/1.0',
  'Accept': 'application/json',
};

/**
 * 从本地缓存文件读取产品数据（用于 SSG 构建时）
 * 使用动态 import('fs') 避免 Turbopack 打包进客户端 bundle
 */
async function readLocalProductsCache(): Promise<Product[] | null> {
  // 浏览器端永远不执行
  if (typeof window !== 'undefined') return null;
  try {
    const { join } = await import('path');
    const fs = await import('fs');
    const cachePath = join(process.cwd(), 'public', LOCAL_CACHE_FILE);
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const json = JSON.parse(raw);
    if (json.success && Array.isArray(json.products)) {
      console.log(`[fetchProducts] Using local cache: ${json.products.length} products`);
      return json.products;
    }
    return null;
  } catch (err) {
    console.warn('[fetchProducts] Failed to read local cache:', err);
    return null;
  }
}

function getProductsUrl(): string {
  if (typeof window === 'undefined') {
    // 服务端：直连 api.gsmgc.es（Vercel runtime 不被 CF 拦截）
    return `${API_ORIGIN}${PRODUCTS_PATH}`;
  }
  // 客户端：走 /api/proxy（Vercel rewrite）
  return `/api/proxy${PRODUCTS_PATH}`;
}

export async function fetchProducts(): Promise<Product[]> {
  // ★ 策略 1：服务端构建时优先读本地缓存
  if (typeof window === 'undefined') {
    const localProducts = await readLocalProductsCache();
    if (localProducts && localProducts.length > 0) {
      return localProducts;
    }
  }

  // ★ 策略 2：fetch 远程数据
  try {
    const url = getProductsUrl();
    const isServer = typeof window === 'undefined';
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: isServer ? SERVER_HEADERS : { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[fetchProducts] returned ${res.status} from ${isServer ? 'direct' : 'proxy'}`);
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
  // ★ 策略 1：服务端构建时优先读本地缓存
  if (typeof window === 'undefined') {
    const localProducts = await readLocalProductsCache();
    if (localProducts && localProducts.length > 0) {
      return localProducts.find((p: Product) => String(p.id) === String(id)) || null;
    }
  }

  // ★ 策略 2：fetch 远程数据
  try {
    const url = getProductsUrl();
    const isServer = typeof window === 'undefined';
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: isServer ? SERVER_HEADERS : { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !Array.isArray(json.products)) return null;
    const product = json.products.find((p: Product) => String(p.id) === String(id));
    return product || null;
  } catch (err) {
    console.warn('[fetchProductById] fetch failed:', err);
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
