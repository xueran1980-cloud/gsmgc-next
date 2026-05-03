/**
 * Category Display Configuration
 *
 * ★ 对齐现站 gsmgc.es 侧边栏结构：
 *   Marcas = 手机/设备品牌（17个）
 *   Tipo de Producto = 产品类型（其余根分类）
 *
 *   数据源：product_cat taxonomy（只读）
 */

/** 现站 Marcas 中实际显示的品牌 slug */
export const BRAND_CATEGORY_NAMES = new Set([
  'iphone',
  'samsung',
  'xiaomi',
  'oppo',
  'huawei',
  'vivo',
  'tcl',
  'ipad',
  'motorola',
  'lenovo',
  'zte',
  'sony',
  'alcatel',
  'lg',
  'one-plus',
  'philipis',
  'panasonic',
]);

/** 排除的 slug */
export const EXCLUDED_CATEGORY_NAMES = new Set([
  'sin-categorizar', 'uncategorized',
]);
