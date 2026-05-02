/**
 * Display Formatter — WC 原始数据 → UI 展示数据
 *
 * ★ 规则来源：WooCommerce PHP theme（gsmgc.es 现站）
 * ★ 所有产品渲染前必须经过 formatter，禁止直接使用 WC 原始字段
 *
 * WC Theme 展示规则：
 * 1. 价格：西班牙语格式（逗号小数），含 IGIC
 * 2. 标题：截断 ~60 字符 + "..."
 * 3. SEO：short_description 必须显示
 * 4. SKU：列表页不显示（WP theme 习惯）
 * 5. 排序：默认 popularity → price asc → price desc
 * 6. 折扣：sale_price < regular_price → "Oferta" 标签
 * 7. 税费：价格旁显示 "IGIC incluido"
 */

import type { Product } from './api';

// ========== 常量 ==========

export const IGIC_RATE = 0.07;
export const TITLE_MAX_CHARS = 60;
export const NAME_MAX_CHARS = 55; // for SEO/meta

// ========== 西班牙语数字格式化 ==========

/**
 * 格式化为西班牙语价格字符串
 *   formatSpanishPrice(10.50) → "10,50 €"
 */
export function formatSpanishPrice(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '0,00 €';
  // 整数部分千分位点，小数部分逗号
  const intPart = Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = n.toFixed(2).split('.')[1];
  return `${intPart},${decPart} €`;
}

/**
 * 计算含 IGIC 价格
 */
export function calcIGIC(base: number): number {
  return Math.round(base * (1 + IGIC_RATE) * 100) / 100;
}

/**
 * 计算折扣百分比
 *   calcDiscountPct(10, 12) → 17  (表示 -17%)
 */
export function calcDiscountPct(salePrice: number, regularPrice: number): number {
  if (!regularPrice || regularPrice <= salePrice) return 0;
  return Math.round((1 - salePrice / regularPrice) * 100);
}

// ========== 标题处理 ==========

/**
 * PHP WC theme 风格标题截断
 *   mb_strimwidth($title, 0, 60, '...')
 */
export function formatProductTitle(name: string, maxChars = TITLE_MAX_CHARS): {
  display: string;    // 显示用（含...）
  full: string;       // 完整标题
  truncated: boolean; // 是否截断
} {
  if (!name) return { display: '', full: '', truncated: false };
  const trimmed = name.trim();
  if (trimmed.length <= maxChars) {
    return { display: trimmed, full: trimmed, truncated: false };
  }
  // 在单词边界截断
  let cut = trimmed.substring(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.7) {
    cut = cut.substring(0, lastSpace);
  }
  return {
    display: cut + '...',
    full: trimmed,
    truncated: true,
  };
}

// ========== 价格展示 ==========

export interface DisplayPrice {
  baseFormatted: string;     // "10,50 €"
  igicFormatted: string;     // "11,24 €"
  hasDiscount: boolean;
  discountPct: number;       // 17 表示 17%
  regularFormatted: string;  // "12,00 €" (划线价)
  showOfertaBadge: boolean;
}

export function formatDisplayPrice(
  price: string | number,
  regularPrice?: string | number
): DisplayPrice {
  const base = typeof price === 'string' ? parseFloat(price) : price;
  const regular = regularPrice
    ? typeof regularPrice === 'string'
      ? parseFloat(regularPrice)
      : regularPrice
    : 0;

  const hasDiscount = regular > 0 && base > 0 && regular > base;
  const discountPct = hasDiscount ? calcDiscountPct(base, regular) : 0;
  const igic = calcIGIC(base);

  return {
    baseFormatted: formatSpanishPrice(base),
    igicFormatted: formatSpanishPrice(igic),
    hasDiscount,
    discountPct,
    regularFormatted: hasDiscount ? formatSpanishPrice(regular) : '',
    showOfertaBadge: hasDiscount && discountPct >= 5,
  };
}

// ========== SEO 描述 ==========

/**
 * WC 产品 short_description（SEO 文本）
 * PHP theme 通常在列表页显示截断的 short_description
 */
export function formatSEOExcerpt(
  shortDescription: string | null | undefined,
  maxChars = 100
): string | null {
  if (!shortDescription || !shortDescription.trim()) return null;
  const cleaned = shortDescription
    .replace(/<[^>]+>/g, '')  // 去 HTML
    .replace(/\s+/g, ' ')     // 合并空白
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  // 在单词边界截断
  let cut = cleaned.substring(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.7) {
    cut = cut.substring(0, lastSpace);
  }
  return cut + '...';
}

// ========== 库存状态 ==========

export interface DisplayStock {
  status: 'instock' | 'outofstock' | 'lowstock' | 'onbackorder';
  label: string;         // "En stock", "Agotado", "¡Última unidad!", "Bajo pedido"
  quantity: number | null;
  showQuantity: boolean; // WC theme 只在后台显示数量，前台仅状态
}

export function formatStockStatus(
  stockStatus: string,
  stockQuantity: number | null
): DisplayStock {
  const status = stockStatus === 'instock' ? 'instock'
    : stockStatus === 'outofstock' ? 'outofstock'
    : stockStatus === 'onbackorder' ? 'onbackorder'
    : 'instock';

  const isLowStock = status === 'instock' && stockQuantity !== null && stockQuantity <= 1;

  return {
    status: isLowStock ? 'lowstock' : status,
    label: isLowStock ? '¡Última unidad!'
      : status === 'outofstock' ? 'Agotado'
      : status === 'onbackorder' ? 'Bajo pedido'
      : 'En stock',
    quantity: stockQuantity ?? null,
    showQuantity: false, // WC theme 前向不显示具体数量
  };
}

// ========== SKU（WC theme 列表页不显示） ==========

/**
 * WC 主题默认行为：产品列表页不显示 SKU
 * 仅在详情页显示。列表页 SKU 主要用于管理员。
 */
export function formatSKU(sku: string | null | undefined): {
  display: string;
  showInListing: boolean;
} {
  if (!sku) return { display: '', showInListing: false };
  return {
    display: `REF: ${sku}`,
    showInListing: false, // WC theme 默认
  };
}

// ========== 排序 — 对齐 WC 默认 ==========

/**
 * WC 默认排序选项（与 PHP theme 一致）
 */
export const WC_SORT_OPTIONS = [
  { value: 'popularity', label: 'Más vendidos', order: 'desc' },
  { value: 'price', label: 'Precio: menor a mayor', order: 'asc' },
  { value: 'price-desc', label: 'Precio: mayor a menor', order: 'desc' },
  { value: 'date', label: 'Más recientes', order: 'desc' },
  { value: 'title', label: 'A-Z', order: 'asc' },
] as const;

export const WC_DEFAULT_SORT = 'popularity';

// ========== 搜索匹配 — 对齐 WC 搜索逻辑 ==========

/**
 * WC 默认搜索：匹配标题 AND SKU（不匹配描述）
 * 排序：相关性优先，然后是 menu_order + date
 */
export function wcSearchFilter(products: Product[], query: string): Product[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return products;

  const scored = products.map((p) => {
    let score = 0;
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();

    // 精确匹配权重最高
    if (name === lower) score += 100;
    if (sku === lower) score += 90;

    // 开头匹配次之
    if (name.startsWith(lower)) score += 50;
    if (sku.startsWith(lower)) score += 40;

    // 包含匹配
    if (name.includes(lower)) score += 20;
    if (sku.includes(lower)) score += 10;

    return { product: p, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

// ========== 完整产品展示数据 ==========

export interface DisplayProduct extends Product {
  displayTitle: ReturnType<typeof formatProductTitle>;
  displayPrice: DisplayPrice;
  displayStock: DisplayStock;
  displaySKU: ReturnType<typeof formatSKU>;
  seoExcerpt: string | null;
  imageUrl: string;
  productUrl: string;
}

/**
 * 将 WC 原始 Product → 完整展示数据
 * ★ 所有产品组件渲染前必须调用此函数
 */
export function formatProduct(product: Product): DisplayProduct {
  return {
    ...product,
    displayTitle: formatProductTitle(product.name),
    displayPrice: formatDisplayPrice(product.price, product.regular_price),
    displayStock: formatStockStatus(product.stock_status, product.stock_quantity ?? null),
    displaySKU: formatSKU(product.sku),
    seoExcerpt: formatSEOExcerpt(product.short_description),
    imageUrl: product.images?.[0]?.src || '',
    productUrl: `/producto/${product.id}/${formatProductSlug(product.name)}`,
  };
}

/**
 * 提取产品 slug（同 ProductCard generateSlug）
 */
function formatProductSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
