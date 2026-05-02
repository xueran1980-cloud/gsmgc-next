/**
 * Product Category Display Configuration
 * 
 * ★ SINGLE SOURCE PRINCIPLE:
 *   All brands/categories come from WooCommerce `product_cat` taxonomy.
 *   There is NO independent brand system. These lists are DISPLAY CLASSIFIERS
 *   that decide which product_cat entries render as "Marcas" vs "Categorías".
 *   
 *   To add/remove a brand: edit BRAND_CATEGORY_NAMES below.
 *   To add/remove a product type: edit PRODUCT_TYPE_CATEGORY_NAMES below.
 * 
 *   Backend data source: GET /api/categories → WooCommerce product_cat
 *   Filter query: GET /api/products?category={slug}
 */

/** product_cat names that display as "Marcas" (brands) */
export const BRAND_CATEGORY_NAMES = new Set([
  'APPLE', 'IPHONE', 'IPAD', 'SAMSUNG', 'XIAOMI', 'HUAWEI', 'OPPO',
  'VIVO', 'ONEPLUS', 'MOTOROLA', 'TCL', 'ZTE', 'ALCATEL', 'NOKIA',
  'HONOR', 'LENOVO', 'REALME', 'GOOGLE', 'SONY', 'LG', 'ASUS', 'BLACKBERRY',
]);

/** product_cat names that display as "Categorías" (product types) */
export const PRODUCT_TYPE_CATEGORY_NAMES = new Set([
  'pantallas', 'fundas', 'baterias', 'baterías', 'cables', 'cargadores',
  'audio', 'auriculares', 'herramientas', 'accesorios', 'cristales',
  'cristales templados', 'teclados', 'repuestos', 'conectores',
  'flex', 'altavoces', 'vibradores', 'cámaras', 'camaras',
  'tactiles', 'táctiles', 'displays',
  'cable de datos', 'protector de pantalla', 'protector',
]);

/** product_cat names to exclude from display entirely */
export const EXCLUDED_CATEGORY_NAMES = new Set([
  'sin categorizar', 'uncategorized', 'sin categoria',
  'Sin categorizar', 'Uncategorized', 'Sin categoría',
  'otros', 'op', 'otro', 'misc', 'varios',
  'Otros', 'Misc', 'Varios', 'OP',
]);
