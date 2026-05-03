/**
 * Category Display Configuration
 *
 * ★ FINAL MAPPING CONTRACT — SINGLE SOURCE
 *   brand = ONLY category WHERE slug IN BRAND_WHITELIST (5 brands)
 *   All other categories → display as "Categorías" (product types)
 *
 *   Primary brand definition: src/lib/display-formatter.ts → BRAND_WHITELIST
 *   This file: display classifier for TiendaClient sidebar
 */

/** Product category slugs that display as "Marcas" (brands) in sidebar */
export const BRAND_CATEGORY_NAMES = new Set([
  'samsung',
  'iphone',
  'xiaomi',
  'huawei',
  'oppo',
]);

/** Product category slugs that display as "Categorías" (product types) */
export const PRODUCT_TYPE_CATEGORY_NAMES = new Set([
  'pantallas', 'fundas', 'baterias', 'cargadores',
  'audio', 'herramientas', 'accesorios',
  'cable-de-datos', 'protector-de-pantalla', 'bateria-externa',
]);

/** Product category slugs to exclude from display */
export const EXCLUDED_CATEGORY_NAMES = new Set([
  'sin-categorizar', 'uncategorized',
]);
