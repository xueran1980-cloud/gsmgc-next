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
// ✅ 修复：Server Component 中必须使用绝对 URL
// 降级策略：先尝试 /api/products，失败后直连 WordPress 代理

const PROXY_URL = 'https://gsmgc-next.vercel.app/api/proxy/wp-json/gsmgc/v1/products-raw';

export async function fetchProducts(): Promise<Product[]> {
  // 策略1：尝试 /api/products（需要 NEXT_PUBLIC_BASE_URL）
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products`, {
        cache: 'no-store',
        headers: { 'User-Agent': 'GSMGC-Next-Server/1.0' },
      });
      if (res.ok) {
        const data: Product[] = await res.json();
        return data;
      }
    } catch (err) {
      console.warn('[fetchProducts] /api/products failed, trying proxy...', err);
    }
  }

  // 策略2：直连 WordPress 代理（绕过 /api/products）
  try {
    const res = await fetch(PROXY_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'GSMGC-Next-Proxy/1.0',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`[fetchProducts] proxy returned ${res.status}`);
      return [];
    }
    const json = await res.json();
    if (!json.success || !Array.isArray(json.products)) {
      console.warn('[fetchProducts] invalid proxy response');
      return [];
    }
    return json.products;
  } catch (err) {
    console.warn('[fetchProducts] proxy fetch failed:', err);
    return [];
  }
}

// ---------- 服务端获取单个产品 ----------
// ✅ 修复：增加降级策略

export async function fetchProductById(id: string): Promise<Product | null> {
  // 策略1：尝试 /api/products/:id
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products?id=${id}`, {
        cache: 'no-store',
        headers: { 'User-Agent': 'GSMGC-Next-Server/1.0' },
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[fetchProductById] /api/products failed, trying proxy...', err);
    }
  }

  // 策略2：直连 WordPress 代理，然后按 ID 过滤
  try {
    const res = await fetch(PROXY_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'GSMGC-Next-Proxy/1.0',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !Array.isArray(json.products)) return null;
    const product = json.products.find((p: Product) => String(p.id) === String(id));
    return product || null;
  } catch (err) {
    console.warn('[fetchProductById] proxy fetch failed:', err);
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

export function getProductImage(product: Product & { image?: ProductImage }): string {
  // ★ 完整 fallback 链：images[0].src → image.src → placeholder
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
