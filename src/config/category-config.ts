/**
 * Category Display Configuration
 *
 * 数据源：product_cat taxonomy（只读）
 *
 * ★ Plan A（2026-09-10）：品牌识别逻辑已迁移至 src/lib/brandCategory.ts
 *   （单一事实源：品牌 = parent === Marcas 父分类 id，运行时动态判定）。
 *   本文件仅保留「排除 slug」配置；品牌白名单 BRAND_CATEGORY_NAMES 已移除。
 */

/** 排除的 slug（不显示在 Marcas / Categorías 中） */
export const EXCLUDED_CATEGORY_NAMES = new Set([
  'sin-categorizar', 'uncategorized',
]);
