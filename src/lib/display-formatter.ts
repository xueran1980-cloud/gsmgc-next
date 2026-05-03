/**
 * FINAL MAPPING CONTRACT — SINGLE SOURCE OF TRUTH
 *
 * ★ 所有 UI 渲染必须经过此文件
 * ★ 禁止组件级逻辑
 * ★ 禁止重复过滤
 * ★ 禁止 JS 截断标题
 *
 * 规则来源：gsmgc.es 现站行为
 */

import type { Product } from './api';

// ═══════════════════════════════════════════════════════════
// 1. BRAND WHITELIST — ONLY these 5 brands
//    brand = category WHERE slug IN BRAND_WHITELIST
// ═══════════════════════════════════════════════════════════

export const BRAND_WHITELIST = [
  'samsung',
  'iphone',
  'xiaomi',
  'huawei',
  'oppo',
] as const;

export type BrandSlug = (typeof BRAND_WHITELIST)[number];

export function isBrand(slug: string): slug is BrandSlug {
  return BRAND_WHITELIST.includes(slug as BrandSlug);
}

/** 从 product.categories 提取品牌 slug（只返回白名单内的） */
export function getProductBrand(product: Product): BrandSlug | null {
  if (!product.categories) return null;
  for (const c of product.categories) {
    if (isBrand(c.slug)) return c.slug as BrandSlug;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// 2. PRICE — Spanish locale: comma decimal, space before €
// ═══════════════════════════════════════════════════════════

const IGIC_RATE = 0.07;

export function formatPrice(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '0,00 €';
  const intPart = Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = n.toFixed(2).split('.')[1];
  return `${intPart},${decPart} €`;
}

export function calcIGIC(base: number): number {
  return Math.round(base * (1 + IGIC_RATE) * 100) / 100;
}

export interface DisplayPrice {
  base: string;           // "10,50 €"
  igic: string;           // "11,24 €"
  hasDiscount: boolean;
  discountPct: number;
  regular: string;        // "12,00 €" (crossed out)
  showBadge: boolean;     // ≥5% discount
}

export function getDisplayPrice(
  price: string | number,
  regularPrice?: string | number
): DisplayPrice {
  const base = typeof price === 'string' ? parseFloat(price) : price;
  const regular = regularPrice
    ? (typeof regularPrice === 'string' ? parseFloat(regularPrice) : regularPrice)
    : 0;
  const hasDiscount = regular > 0 && base > 0 && regular > base;
  const pct = hasDiscount ? Math.round((1 - base / regular) * 100) : 0;

  return {
    base: formatPrice(base),
    igic: formatPrice(calcIGIC(base)),
    hasDiscount,
    discountPct: pct,
    regular: hasDiscount ? formatPrice(regular) : '',
    showBadge: hasDiscount && pct >= 5,
  };
}

// ═══════════════════════════════════════════════════════════
// 3. TITLE — render full string, CSS handles overflow
// ═══════════════════════════════════════════════════════════

/** NO truncation. Pass raw product.name to UI. CSS line-clamp only. */
export function getDisplayTitle(product: Product): string {
  return product.name || '';
}

// ═══════════════════════════════════════════════════════════
// 4. CATEGORY FILTER — slug only
// ═══════════════════════════════════════════════════════════

export function matchCategory(products: Product[], slug: string): Product[] {
  const target = slug.toLowerCase().trim();
  if (!target) return products;
  return products.filter(p =>
    p.categories?.some(c => c.slug?.toLowerCase() === target)
  );
}

// ═══════════════════════════════════════════════════════════
// 5. CATEGORY LIST — only categories with >=1 product
// ═══════════════════════════════════════════════════════════

export interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export function getCategoriesWithCount(products: Product[]): CategoryWithCount[] {
  const map = new Map<number, CategoryWithCount>();
  for (const p of products) {
    if (!p.categories) continue;
    for (const c of p.categories) {
      if (!map.has(c.id)) {
        map.set(c.id, { id: c.id, name: c.name, slug: c.slug, count: 0 });
      }
      map.get(c.id)!.count++;
    }
  }
  return [...map.values()].filter(c => c.count > 0);
}

// ═══════════════════════════════════════════════════════════
// 6. SEARCH — match ONLY name + SKU, case insensitive
// ═══════════════════════════════════════════════════════════

export function matchSearch(products: Product[], query: string): Product[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return products;

  const scored = products.map(p => {
    let score = 0;
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();

    if (name === lower) score += 100;
    if (sku === lower) score += 90;
    if (name.startsWith(lower)) score += 50;
    if (sku.startsWith(lower)) score += 40;
    if (name.includes(lower)) score += 20;
    if (sku.includes(lower)) score += 10;

    return { product: p, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

// ═══════════════════════════════════════════════════════════
// 7. SORT — primary: total_sales DESC, secondary: id DESC
// ═══════════════════════════════════════════════════════════

export function applySort(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const salesA = a.total_sales ?? 0;
    const salesB = b.total_sales ?? 0;
    if (salesB !== salesA) return salesB - salesA;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

// ═══════════════════════════════════════════════════════════
// 8. PAGINATION — API-driven, NEVER recalc on frontend
// ═══════════════════════════════════════════════════════════

export interface PageResult {
  products: Product[];
  totalCount: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export function paginate(products: Product[], page: number, perPage: number): PageResult {
  const totalCount = products.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  return {
    products: products.slice(start, start + perPage),
    totalCount,
    totalPages,
    page,
    perPage,
  };
}

// ═══════════════════════════════════════════════════════════
// 9. applyMapping() — SINGLE ENTRY POINT for all UI data
//    NEVER duplicate this logic in components
// ═══════════════════════════════════════════════════════════

export interface MappingParams {
  products: Product[];
  category?: string;   // category slug from URL
  search?: string;     // search query
  page?: number;
  perPage?: number;
}

export interface MappedResult extends PageResult {
  applied: {
    category: boolean;
    search: boolean;
    sort: boolean;
    pagination: boolean;
  };
}

/** THE ONLY function that all UI must call */
export function applyMapping(params: MappingParams): MappedResult {
  const { category, search, page = 1, perPage = 24 } = params;
  let products = [...params.products];

  // Step 1: category filter (slug-only)
  const hadCategory = !!category;
  if (category) products = matchCategory(products, category);

  // Step 2: search filter (name + SKU)
  const hadSearch = !!search;
  if (search) products = matchSearch(products, search);

  // Step 3: sort (total_sales DESC, id DESC)
  products = applySort(products);

  // Step 4: paginate
  const result = paginate(products, page, perPage);

  return {
    ...result,
    applied: {
      category: hadCategory,
      search: hadSearch,
      sort: true,
      pagination: true,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// 10. PRODUCT URL helper
// ═══════════════════════════════════════════════════════════

export function getProductUrl(product: Product): string {
  const slug = product.slug || product.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `/producto/${product.id}/${slug}` : `/producto/${product.id}`;
}
