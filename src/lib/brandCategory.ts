// ★ Plan A 唯一品牌识别来源（2026-09-10）
//
// 品牌判定规则（单一事实源，BrandsSection 与 TiendaClient 都调用这里）：
//   品牌 = parent === Marcas 父分类 id（运行时从 categories-raw 动态取得）
//
// 不再依赖 category-config.ts 的静态白名单作为主逻辑。
// 向后兼容：生产 taxonomy 迁移（新建 Marcas + 17 品牌 parent 指向 Marcas）完成前，
// Marcas 分类尚不存在 → getMarcasParentId() 返回 null → 自动回退 LEGACY_BRAND_SLUGS
// 白名单，前端行为与此前完全一致（无半迁移状态）。迁移验证完成后 LEGACY_BRAND_SLUGS 可删。

import type { ProductCategory } from '@/lib/api';
import { EXCLUDED_CATEGORY_NAMES } from '@/config/category-config';

export const MARCAS_SLUG = 'marcas';

/** 迁移前的临时回退白名单（17 品牌 slug）。迁移验证后删除。 */
export const LEGACY_BRAND_SLUGS = new Set<string>([
  'iphone', 'samsung', 'xiaomi', 'oppo', 'huawei', 'vivo', 'tcl', 'ipad',
  'motorola', 'lenovo', 'zte', 'sony', 'alcatel', 'lg', 'one-plus', 'philipis', 'panasonic',
]);

/** 从分类列表中取得 Marcas 父分类的 id（不存在返回 null） */
export function getMarcasParentId(
  categories: ProductCategory[] | undefined | null,
): number | null {
  if (!categories || !Array.isArray(categories)) return null;
  for (const c of categories) {
    if ((c.slug || '').toLowerCase() === MARCAS_SLUG) return c.id;
  }
  return null;
}

/** 单个分类是否为品牌（parent === marcasParentId；marcasParentId 未知时回退白名单） */
export function isBrandCategory(
  cat: ProductCategory,
  marcasParentId: number | null,
): boolean {
  if ((cat.count ?? 0) <= 0) return false;
  const slug = (cat.slug || '').toLowerCase();
  if (EXCLUDED_CATEGORY_NAMES.has(slug)) return false;
  if (marcasParentId != null) return (cat.parent ?? 0) === marcasParentId;
  return LEGACY_BRAND_SLUGS.has(slug);
}

/** 品牌列表（按 count 降序） */
export function getBrandCategories(
  categories: ProductCategory[] | undefined | null,
  marcasParentId: number | null,
): ProductCategory[] {
  if (!categories || !Array.isArray(categories)) return [];
  return [...categories]
    .filter(c => isBrandCategory(c, marcasParentId))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

/** 真实分类（Categoría / Tipo de Producto）：排除品牌、Marcas 容器、排除 slug */
export function getRealCategories(
  categories: ProductCategory[] | undefined | null,
  marcasParentId: number | null,
): ProductCategory[] {
  if (!categories || !Array.isArray(categories)) return [];
  return [...categories]
    .filter(c => {
      if ((c.count ?? 0) <= 0) return false;
      const slug = (c.slug || '').toLowerCase();
      if (EXCLUDED_CATEGORY_NAMES.has(slug)) return false;
      if (slug === MARCAS_SLUG) return false;
      if (marcasParentId != null && (c.parent ?? 0) === marcasParentId) return false;
      if (marcasParentId == null && LEGACY_BRAND_SLUGS.has(slug)) return false;
      return true;
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}
