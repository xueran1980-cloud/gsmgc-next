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
  if (typeof window !== 'undefined') {
    return `/api/proxy${API_PATH}`;
  }
  // 服务端：走 Next.js API Route（已验证可用，CF 不拦截）
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gsmgc-next.vercel.app';
  return `${siteUrl}/api/products?per_page=5000`;
}

// ★ 请求内去重：同一请求周期内只拉一次全量产品
//    /producto/[id]/[slug] 页面 generateMetadata + 主组件 + 相关产品
//    原本会调用 fetchProducts() 3 次，现在合并为 1 次
let _fetchProductsPromise: Promise<Product[]> | null = null;

async function _actualFetchProducts(): Promise<Product[]> {
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
    // 兼容多种响应格式：
    // - /api/products (旧) → { products: Product[], totalCount, totalPages, ... }
    // - /api/products (新) → { success: true, products: Product[], ... }
    // - products-raw → { success: true, products: Product[] }
    // - 旧版 → Product[]
    if (Array.isArray(json)) return json;
    // 先检查 products 数组（不要求 success 字段）
    if (json.products && Array.isArray(json.products)) return json.products;
    if (json.success && Array.isArray(json.products)) return json.products;
    console.warn('[fetchProducts] invalid response format:', Object.keys(json));
    return [];
  } catch (err) {
    console.warn('[fetchProducts] fetch failed:', err);
    return [];
  }
}

export async function fetchProducts(): Promise<Product[]> {
  if (_fetchProductsPromise) {
    // ★ 如果缓存的 Promise 已 resolve 且为空，说明第一次 fetch 失败了
    //    清除缓存 → 允许重试（防止 generateMetadata 阶段失败锁死整个请求）
    try {
      const cached = await _fetchProductsPromise;
      if (cached.length === 0) {
        _fetchProductsPromise = null;
      } else {
        return cached;
      }
    } catch {
      _fetchProductsPromise = null;
    }
  }
  _fetchProductsPromise = _actualFetchProducts();
  return _fetchProductsPromise;
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

export function getProductImage(product: Product): string {
  return product.images?.[0]?.src || '/product-placeholder.svg';
}

export function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return '0,00';
  return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
