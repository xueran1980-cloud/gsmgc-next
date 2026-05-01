'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product, ProductCategory } from '@/lib/api';
import { clientFetchProducts, clientFetchCategories } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

const PER_PAGE = 24;

// ─── 品牌与类型分类常量（对齐旧站 ShopPage.jsx）─────────
const KNOWN_BRANDS = new Set([
  'APPLE', 'IPHONE', 'IPAD', 'SAMSUNG', 'XIAOMI', 'HUAWEI', 'OPPO',
  'VIVO', 'ONEPLUS', 'MOTOROLA', 'TCL', 'ZTE', 'ALCATEL', 'NOKIA',
  'HONOR', 'LENOVO', 'REALME', 'GOOGLE', 'SONY', 'LG', 'ASUS', 'BLACKBERRY',
]);

const EXCLUDED_TOP_CATEGORIES = new Set([
  'sin categorizar', 'uncategorized', 'sin categoria',
  'Sin categorizar', 'Uncategorized', 'Sin categoría',
  'otros', 'op', 'otro', 'misc', 'varios',
  'Otros', 'Misc', 'Varios', 'OP',
]);

const TYPE_KEYWORDS = [
  'ACCESORIOS', 'AUDIO', 'BATERIA', 'BATERIAS', 'BAT', 'CABLE', 'CABLES',
  'CARGADOR', 'CARGADORES', 'FUNDAS', 'FUNDA', 'HERRAMIENTAS',
  'HERRAMIENTA', 'CAMARA', 'CAMARAS', 'PANTALLA', 'PANTALLAS',
  'PLACA', 'FLEX', 'PROTECTOR', 'PROTECTORES',
];

const TYPE_ICON_MAP: Record<string, string> = {
  'bateria': '\u{1F50B}', 'baterias': '\u{1F50B}', 'bat': '\u{1F50B}',
  'cable': '\u{1F50C}', 'cables': '\u{1F50C}',
  'cargador': '\u{1F50C}', 'cargadores': '\u{1F50C}',
  'funda': '\u{1F4F1}', 'fundas': '\u{1F4F1}',
  'pantalla': '\u{1F4FA}', 'pantallas': '\u{1F4FA}',
  'protector': '\u{1F6E1}', 'protectores': '\u{1F6E1}',
  'audifono': '\u{1F3A7}', 'auricular': '\u{1F3A7}', 'auriculares': '\u{1F3A7}', 'audio': '\u{1F3A7}',
  'camara': '\u{1F4F8}', 'camaras': '\u{1F4F8}',
  'placa': '\u{1F527}', 'flex': '\u{1F527}',
  'herramienta': '\u{1F6E0}', 'herramientas': '\u{1F6E0}',
  'accesorio': '\u{1F4E6}', 'accesorios': '\u{1F4E6}',
};

// ─── 配件类型硬编码规则（仅用于杂牌产品名模糊匹配兜底）─────────
interface FallbackTypePattern {
  slug: string;
  label: string;
  icon: string;
  patterns: RegExp[];
}

const FALLBACK_TYPE_PATTERNS: FallbackTypePattern[] = [
  { slug: 'cables-cargadores', label: 'Cables y Cargadores', icon: '\u{1F50C}',
    patterns: [/\bcable\s+(type[ -]?c|lightning|usb[- ]?c)\s+/i, /\bcable\s+(datos|carga)\s+/i, /\bcargador\s+(type[ -]?c\s+to\s+lightning|con\s+cable|red|pared)/i] },
  { slug: 'auriculares', label: 'Auriculares', icon: '\u{1F3A7}',
    patterns: [/\bauricular(es)?\s*(bluetooth|\s*stereo)?$/i, /\baud[i\u00ED]fono(s)?\s*$/i] },
  { slug: 'camaras', label: 'C\u00e1maras', icon: '\u{1F4F8}',
    patterns: [/\bcamara\s+(trasera|frontal|original|compatib)/i, /\blente\s+de\s+camara\b/i] },
  { slug: 'placas-flex', label: 'Placas / Flex', icon: '\u{1F527}',
    patterns: [/\bplaca\s+(de\s+)?carga\s+/i, /\bflex\s+(main\s+para|de\s+carga\s+)/i] },
];

// ─── 统一排序函数（对齐现站 WooCommerce 排序逻辑）─────────
// 所有产品数据在渲染前必须经过此函数处理
function sortProducts(
  products: Product[],
  orderby: string = 'price',
  order: string = 'desc'
): Product[] {
  const list = [...products];
  const mult = order === 'asc' ? 1 : -1;

  switch (orderby) {
    case 'price':
      return list.sort((a, b) =>
        mult * (parseFloat(a.price || '0') - parseFloat(b.price || '0'))
      );

    case 'title':
      return list.sort((a, b) =>
        mult * a.name.localeCompare(b.name, 'es')
      );

    case 'popularity':
      return list.sort((a, b) =>
        mult * ((a.total_sales || 0) - (b.total_sales || 0))
      );

    case 'date':
      return list.sort((a, b) =>
        mult * (new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
      );

    default:
      return list;
  }
}

// ─── 辅助函数（对齐旧站）─────────────────────────────────────

/**
 * 判断产品是否匹配某个 fallback 类型的名称模式
 */
function matchFallbackType(productName: string, typeSlug: string): boolean {
  const typeDef = FALLBACK_TYPE_PATTERNS.find(t => t.slug === typeSlug);
  if (!typeDef) return false;
  return typeDef.patterns.some(p => p.test(productName));
}

/**
 * 判断产品是否有品牌分类（即：属于某个品牌，不是杂牌）
 */
function hasBrandCategory(
  productCategories?: ProductCategory[],
  brandCatNames?: Set<string>,
): boolean {
  if (!productCategories || !brandCatNames) return false;
  return productCategories.some(c => brandCatNames.has(c.name || ''));
}

/**
 * 获取类型图标
 */
function getTypeIcon(name: string): string {
  const n = (name || '').toLowerCase().trim();
  for (const [key, icon] of Object.entries(TYPE_ICON_MAP)) {
    if (n.includes(key)) return icon;
  }
  return '\u{1F4E6}';
}

/**
 * 搜索关键词高亮（对齐旧站）
 */
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight || !text) return <>{text}</>;
  // 安全：截断超长搜索词，防止 ReDoS 攻击
  const safeHighlight = highlight.slice(0, 100);
  const escaped = safeHighlight.replace(/[.*+?^${}|()[\]\\]/g, '\\$&');
  try {
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === safeHighlight.toLowerCase()
            ? <mark key={i} className="bg-yellow-200/70 text-gray-900 px-0.5 rounded font-semibold">{part}</mark>
            : <span key={i}>{part}</span>
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

export default function TiendaClient({ categories: categoriesProp }: { categories?: ProductCategory[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Client-side fetch products + categories (like old site SPA behavior)
  // ★ products 载入后经过 sortProducts() 统一排序后再入 state
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      clientFetchProducts(),
      clientFetchCategories(),
    ]).then(([prods, cats]) => {
      if (!cancelled) {
        // ★ 统一排序层：所有产品进入 state 前必须经过 sortProducts()
        // 使用默认排序规则（price-desc）对齐现站首屏行为
        const sorted = sortProducts(prods, 'price', 'desc');
        setProducts(sorted);
        setCategories(cats);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Read params from URL — 对齐旧站默认值：price-desc
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const productType = searchParams.get('type') || ''; // ★ 配件类型筛选
  const orderby = searchParams.get('orderby') || 'price'; // ★ 默认 price (旧站)
  const order = searchParams.get('order') || 'desc';

  // ★ updateParam — 对齐旧站行为：清除 page + scrollTo(0,0)
  const updateParam = useCallback((key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    window.scrollTo(0, 0); // ★ 对齐旧站
  }, [searchParams, pathname, router]);

  // ★ resetFilters — 清除所有筛选
  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
    window.scrollTo(0, 0);
  }, [router, pathname]);

  // ★ activeCategory — 同时匹配 id 和 slug（对齐旧站）
  const activeCategory = categories.find(c =>
    String(c.id) === categoryParam ||
    (c.slug || '').toLowerCase() === categoryParam.toLowerCase()
  );

  // ★ 图标映射使用文件级 TYPE_ICON_MAP 常量

  // ★ 动态提取配件类型分类（对齐旧站）
  const typeCategories = useMemo(() => {
    const topLevelTypes = (categories || []).filter(c => {
      if (c.parent !== 0) return false;
      if ((c.count ?? 0) <= 0) return false;
      const nameRaw = (c.name || '').trim();
      const n = nameRaw.toUpperCase();
      if (EXCLUDED_TOP_CATEGORIES.has(nameRaw) || EXCLUDED_TOP_CATEGORIES.has(n)) return false;
      if (KNOWN_BRANDS.has(n)) return false;
      for (const kw of TYPE_KEYWORDS) {
        if (n.includes(kw)) return true;
      }
      return false;
    });
    const childTypes = (categories || []).filter(c => c.parent !== 0 && (c.count ?? 0) > 0);
    const allTypes = [...topLevelTypes, ...childTypes];
    const seen = new Set();
    return allTypes
      .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  }, [categories]);

  // ★ activeType: 仅当用户明确选择了类型筛选时才有值（URL 有 ?type=）
  const activeType = productType
    ? [...(typeCategories || []), ...FALLBACK_TYPE_PATTERNS].find(t =>
        (t.slug || '').toLowerCase() === productType.toLowerCase() ||
        ('name' in t && (t as ProductCategory).name?.toLowerCase() === productType.toLowerCase())
      )
    : null;

  // 分离品牌和配件类型 — 只把真正的品牌放 Marcas，按数量降序排列（对齐旧站）
  const brandCategories = [...categories]
    .filter(c => {
      if (c.parent !== 0 || (c.count ?? 0) <= 0) return false;
      const nameRaw = (c.name || '').trim();
      const n = nameRaw.toUpperCase();

      // ❌ 排除 "Sin categorizar" / "Uncategorized"
      if (EXCLUDED_TOP_CATEGORIES.has(nameRaw) || EXCLUDED_TOP_CATEGORIES.has(n)) return false;

      // ✅ 白名单：已知品牌直接通过（IPHONE/IPAD 都在这里）
      if (KNOWN_BRANDS.has(n)) return true;

      // ❌ 黑名单：包含产品类型关键词的 → 移到 Tipo de Producto 区域
      for (const kw of TYPE_KEYWORDS) {
        if (n.includes(kw)) return false;
      }

      // 兜底：其他未知的顶级分类保留为品牌（老板以后加的新品牌）
      return true;
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0)); // ★ 按数量从多到少排列

  // ─── 延迟计算各类型的产品数量（对齐旧站）──
  const [computedTypeCounts, setComputedTypeCounts] = useState<Record<string, number>>({});
  const computedCountsInitRef = useRef(false);

  useEffect(() => {
    // Only run once when products and typeCategories are ready
    if (!products.length || !typeCategories.length || computedCountsInitRef.current) return;
    computedCountsInitRef.current = true;

    // Build brand cat names set for fallback filtering
    const brandCats = (categories || []).filter(c => {
      if (c.parent !== 0) return false;
      const nameRaw = (c.name || '').trim();
      const n = nameRaw.toUpperCase().trim();
      if (EXCLUDED_TOP_CATEGORIES.has(nameRaw) || EXCLUDED_TOP_CATEGORIES.has(n)) return false;
      for (const kw of TYPE_KEYWORDS) { if (n.includes(kw)) return false; }
      return true;
    });
    const brandCatNames = new Set(brandCats.map(c => c.name));

    const counts: Record<string, number> = {};
    for (const tc of typeCategories) {
      counts[tc.slug] = products.filter(p =>
        (p.categories || []).some(c =>
          c.id === tc.id ||
          (c.name || '').toLowerCase() === (tc.name || '').toLowerCase() ||
          (c.slug || '').toLowerCase() === (tc.slug || '').toLowerCase()
        )
      ).length;
    }
    const miscProducts = products.filter(p => !hasBrandCategory(p.categories, brandCatNames));
    for (const ft of FALLBACK_TYPE_PATTERNS) {
      counts[ft.slug] = miscProducts.filter(p => matchFallbackType(p.name || '', ft.slug)).length;
    }
    setComputedTypeCounts(counts);
  }, [products, typeCategories, categories]);

  // Filter + sort + paginate（对齐旧站的完整过滤逻辑）
  const result = useMemo(() => {
    let filtered = [...products];

    // ── 阶段1: 品牌过滤（对齐旧站：slug 精确匹配 + 模糊匹配）──
    if (categoryParam) {
      const brandLower = categoryParam.toLowerCase();
      const brandUpper = categoryParam.toUpperCase();
      const isShortBrand = brandUpper.length < 3; // 短品牌名跳过模糊匹配
      filtered = filtered.filter(p => {
        // 精确匹配分类名或 slug
        const catMatch = (p.categories || []).some(c =>
          (c.name || '').toLowerCase() === brandLower ||
          (c.slug || '').toLowerCase() === brandLower
        );
        if (catMatch) return true;
        // 模糊匹配 SKU 或产品名中的品牌词（仅品牌名>=3字符时启用）
        if (!isShortBrand) {
          if ((p.sku || '').toUpperCase().includes(brandUpper)) return true;
          if ((p.name || '').toUpperCase().includes(brandUpper)) return true;
        }
        return false;
      });
    }

    // ── 阶段2: 类型过滤（?type=xxx，对齐旧站）──
    if (productType) {
      const typeLower = productType.toLowerCase();
      filtered = filtered.filter(p => {
        // 方案A：产品的分类直接匹配（最可靠）
        const catMatch = (p.categories || []).some(c => {
          const cSlug = (c.slug || '').toLowerCase();
          const cName = (c.name || '').toLowerCase();
          const cId = String(c.id || '');
          if (cSlug === typeLower || cName === typeLower) return true;
          if (cSlug.includes(typeLower) || typeLower.includes(cSlug)) return true;
          if (typeLower === cId) return true;
          return false;
        });
        if (catMatch) return true;

        // 方案B：无品牌杂牌 → fallback 名称模式匹配
        const brandCats = (categories || []).filter(c => {
          if (c.parent !== 0) return false;
          const n = ((c.name || '') as string).toUpperCase().trim();
          if (EXCLUDED_TOP_CATEGORIES.has(c.name || '')) return false;
          for (const kw of TYPE_KEYWORDS) { if (n.includes(kw)) return false; }
          return true;
        });
        const brandCatNames = new Set(brandCats.map(c => c.name));
        if (!hasBrandCategory(p.categories, brandCatNames)) {
          return matchFallbackType(p.name || '', typeLower);
        }
        return false;
      });
    }

    // Search filter
    if (searchParam) {
      const q = searchParam.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // ★ 统一排序层：filter 后的数据也必须重新 sort
    const sorted = sortProducts(filtered, orderby, order);

    // Paginate
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / PER_PAGE);
    const page = Math.max(1, Math.min(pageParam, totalPages));
    const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return { paginated, totalCount, totalPages, page };
  }, [products, categoryParam, productType, searchParam, orderby, order, pageParam, categories]);

  // Smart page numbers with ellipsis（对齐旧站）
  function renderPagination() {
    if (result.totalPages <= 1) return null;
    const { page, totalPages } = result;
    const delta = 2;
    const pages: React.ReactNode[] = [];
    let prev: number | null = null;

    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
        if (prev !== null && p - prev > 1) {
          pages.push(<span key={`ellipsis-${p}`} className="px-1 text-gray-400">…</span>);
        }
        pages.push(
          <button
            key={p}
            onClick={() => updateParam('page', String(p))}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
              p === page
                ? 'bg-[#2563eb] text-white'
                : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        );
        prev = p;
      }
    }
    return pages;
  }

  return (
    <div className={`min-h-screen bg-gray-50${!loading ? ' animate-page-enter' : ''}`}>
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[--header-offset] z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb */}
            <div className="text-sm">
              <span className="text-gray-400">Inicio</span>
              <span className="text-gray-300 mx-1.5">/</span>
              <span className="font-semibold text-gray-800">
                {activeCategory ? activeCategory.name : searchParam ? `Buscar: "${searchParam}"` : 'Catálogo'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort — 对齐旧站选项顺序：price-desc first */}
              <select
                value={`${orderby}-${order}`}
                onChange={e => {
                  const [ob, or] = e.target.value.split('-');
                  updateParam('orderby', ob);
                  updateParam('order', or);
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="price-desc">Precio: mayor a menor</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="date-desc">Más nuevos</option>
                <option value="popularity-desc">Más vendidos</option>
                <option value="title-asc">Nombre A-Z</option>
              </select>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="lg:hidden flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <SlidersHorizontal size={15} />
                Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar filters (desktop) — 1:1 对齐旧站：Marcas + Tipo de Producto */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-[calc(var(--header-offset,64px)+1rem)]">
              {/* ── Marcas（品牌）— 对齐旧站 ── */}
              <div className="mb-5">
                <h3 className="font-bold text-sm text-gray-800 mb-2.5 tracking-tight">Marcas</h3>
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-[calc(100vh-18rem)] overflow-y-auto pr-0.5 scrollbar-thin">
                  <button
                    onClick={() => {
                      updateParam('category', '');
                      // Also clear type + search
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete('type'); params.delete('search');
                      const qs = params.toString();
                      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                      window.scrollTo(0, 0);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                      !categoryParam && !productType
                        ? 'bg-[#2563eb] text-white shadow-md shadow-blue-200 scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  {brandCategories.map(brand => {
                    const brandSlug = (brand.slug || brand.name || '').toLowerCase();
                    const isActive = brandSlug === (categoryParam || '').toLowerCase();
                    return (
                      <button
                        key={brand.id}
                        onClick={() => {
                          updateParam('category', brandSlug);
                          // ★ 切换品牌时清除 type 和 search（对齐旧站）
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('category', brandSlug);
                          params.delete('type'); params.delete('page'); params.delete('search');
                          const qs = params.toString();
                          router.push(`${pathname}?${qs}`, { scroll: false });
                          window.scrollTo(0, 0);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                          isActive
                            ? 'bg-[#2563eb] text-white shadow-md shadow-blue-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-[#2563eb]'
                        }`}
                        title={`${brand.name} — ${brand.count} productos`}
                      >
                        {brand.name}
                      </button>
                    );
                  })}
                </div>
                {/* Active filter indicator + Limpiar link（对齐旧站）*/}
                {categoryParam && (
                  <p className="text-[11px] text-[#2563eb] font-medium flex items-center gap-1 mt-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse"></span>
                    <span className="capitalize">{categoryParam}</span>
                    <button
                      onClick={() => resetFilters()}
                      className="ml-auto underline hover:no-underline"
                    >Limpiar</button>
                  </p>
                )}
                {productType && !categoryParam && (
                  <p className="text-[11px] text-purple-600 font-medium flex items-center gap-1 mt-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                    <span className="capitalize">{productType.replace(/-/g, ' ')}</span>
                    <button
                      onClick={() => resetFilters()}
                      className="ml-auto underline hover:no-underline"
                    >Limpiar</button>
                  </p>
                )}
              </div>

              {/* 分隔线 */}
              <div className="border-t border-gray-100 my-4" />

              {/* ── Tipo de Producto（动态配件类型 + fallback）— 对齐旧站 ── */}
              <div>
                <h3 className="font-bold text-sm text-purple-700 mb-2.5 tracking-tight flex items-center gap-1.5">
                  <span>{'\u{1F4CB}'}</span> Tipo de Producto
                </h3>
                <div className="max-h-[320px] overflow-y-auto pr-0.5 scrollbar-thin space-y-2">
                  {/* 动态类型分类（来自 wc_categories.json）*/}
                  {(typeCategories || []).map(tc => {
                    const isActive = (tc.slug || '').toLowerCase() === (productType || '').toLowerCase();
                    const count = computedTypeCounts[tc.slug] || 0;
                    if (count === 0 && !isActive) return null;
                    return (
                      <button
                        key={`tc-${tc.id}`}
                        onClick={() => {
                          if (isActive) {
                            updateParam('type', '');
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete('type'); params.delete('page'); params.delete('search');
                            const qs = params.toString();
                            router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                          } else {
                            updateParam('type', tc.slug);
                            // ★ 切换类型时清除 category 和 search（对齐旧站）
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('type', tc.slug);
                            params.delete('category'); params.delete('page'); params.delete('search');
                            const qs = params.toString();
                            router.push(`${pathname}?${qs}`, { scroll: false });
                          }
                          window.scrollTo(0, 0);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                        title={`${tc.name} — ${count} productos`}
                      >
                        <span className="text-base leading-none shrink-0">{getTypeIcon(tc.name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium truncate leading-tight">{tc.name}</div>
                        </div>
                      </button>
                    );
                  })}
                  {/* Fallback 类型（杂牌产品名称匹配，仅当有数量时显示） */}
                  {FALLBACK_TYPE_PATTERNS.map(ft => {
                    // 如果已有同 slug 的动态分类则跳过
                    if ((typeCategories || []).some(tc => tc.slug === ft.slug)) return null;
                    const isActive = ft.slug === productType;
                    const count = computedTypeCounts[ft.slug] || 0;
                    if (count === 0 && !isActive) return null;
                    return (
                      <button
                        key={`fb-${ft.slug}`}
                        onClick={() => {
                          if (isActive) {
                            updateParam('type', '');
                          } else {
                            updateParam('type', ft.slug);
                          }
                          // ★ 清除 category 和 search
                          const params = new URLSearchParams(searchParams.toString());
                          if (!isActive) params.set('type', ft.slug);
                          else params.delete('type');
                          params.delete('category'); params.delete('page'); params.delete('search');
                          const qs = params.toString();
                          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                          window.scrollTo(0, 0);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                            : 'bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-700 text-xs italic'
                        }`}
                        title={`${ft.label} — ${count} productos (misc)`}
                      >
                        <span className="text-base leading-none shrink-0">{ft.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium truncate leading-tight">{ft.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 快速统计（对齐旧站格式） */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-400">
                  {result.totalCount > 0 ? `${result.totalCount} productos` : ''}{searchParam ? ` · "${searchParam}"` : ''}
                </p>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <main className="flex-1">
            {/* H1 — SEO critical: each page must have exactly one h1（对齐旧站文案） */}
            <h1 className="text-2xl font-black text-gray-900 mb-5 px-1">
              {searchParam
                ? <>Resultados para <span className="text-[#2563eb]">"<HighlightText text={searchParam} highlight={searchParam} />"</span></>
                : activeCategory
                  ? `${activeCategory.name}` // ★ 无后缀（对齐旧站）
                  : activeType
                    ? `${('name' in activeType && (activeType as ProductCategory).name) || (activeType as FallbackTypePattern).label}`
                    : 'Catálogo de Accesorios Móviles al Mayor'}
            </h1>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                    <div className="bg-gray-100 rounded-xl h-40 mb-4" />
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                    <div className="h-5 bg-gray-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : result.paginated.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">{'\u{1F50D}'}</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">No se encontraron productos</h2>
                <p className="text-gray-500 mb-4">Prueba con otros filtros o categorías</p>
                <button
                  onClick={() => resetFilters()}
                  className="bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl"
                >
                  Ver todo
                </button>
              </div>
            ) : (
              <>
                {/* 统计信息（对齐旧站：搜索时显示 resultado(s) 格式） */}
                <p className="text-sm text-gray-500 mb-4">
                  {searchParam
                    ? <>{result.totalCount} resultado{result.totalCount !== 1 ? 's' : ''} para "<span className="font-medium text-gray-700">{searchParam}"</span></>
                    : `${result.totalCount} productos`
                  }
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                  {result.paginated.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* Pagination */}
                {result.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => updateParam('page', String(result.page - 1))}
                      disabled={result.page <= 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {renderPagination()}
                    <button
                      onClick={() => updateParam('page', String(result.page + 1))}
                      disabled={result.page >= result.totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ★ Mobile bottom sheet filter drawer（对齐旧站完整实现） */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFilterOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
            {/* Handle bar */}
            <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b border-gray-100 rounded-t-2xl">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Filtros</h3>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                  aria-label="Cerrar filtros"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {/* Marcas section（mobile） */}
              <div>
                <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-2.5">Marcas</h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      router.push(pathname, { scroll: false });
                      setFilterOpen(false);
                      window.scrollTo(0, 0);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      !categoryParam && !productType ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >Todas</button>
                  {brandCategories.map(brand => {
                    const brandSlug = (brand.slug || brand.name || '').toLowerCase();
                    const isActive = brandSlug === (categoryParam || '').toLowerCase();
                    return (
                      <button
                        key={brand.id}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('category', brandSlug);
                          params.delete('type'); params.delete('page'); params.delete('search');
                          const qs = params.toString();
                          router.push(`${pathname}?${qs}`, { scroll: false });
                          setFilterOpen(false);
                          window.scrollTo(0, 0);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                          isActive ? 'bg-[#2563eb] text-white' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                        }`}
                      >{brand.name}</button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de Producto section（mobile） */}
              <div>
                <h4 className="font-semibold text-xs text-purple-600 uppercase tracking-wider mb-2.5">Tipo de Producto</h4>
                <div className="space-y-1.5">
                  {(typeCategories || []).map(tc => {
                    const isActive = (tc.slug || '').toLowerCase() === (productType || '').toLowerCase();
                    const count = computedTypeCounts[tc.slug] || 0;
                    if (count === 0 && !isActive) return null;
                    return (
                      <button
                        key={`m-${tc.id}`}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          if (isActive) params.delete('type');
                          else { params.set('type', tc.slug); params.delete('category'); }
                          params.delete('page'); params.delete('search');
                          const qs = params.toString();
                          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                          setFilterOpen(false);
                          window.scrollTo(0, 0);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                          isActive ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-purple-50'
                        }`}
                      >
                        <span>{getTypeIcon(tc.name)}</span>
                        <span className="text-[13px] font-medium">{tc.name}</span>
                        <span className={`ml-auto text-[11px] ${isActive ? 'text-purple-200' : 'text-gray-400'}`}>{count}</span>
                      </button>
                    );
                  })}
                  {FALLBACK_TYPE_PATTERNS.map(ft => {
                    if ((typeCategories || []).some(tc => tc.slug === ft.slug)) return null;
                    const isActive = ft.slug === productType;
                    const count = computedTypeCounts[ft.slug] || 0;
                    if (count === 0 && !isActive) return null;
                    return (
                      <button
                        key={`mf-${ft.slug}`}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          if (isActive) params.delete('type');
                          else { params.set('type', ft.slug); params.delete('category'); }
                          params.delete('page'); params.delete('search');
                          const qs = params.toString();
                          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                          setFilterOpen(false);
                          window.scrollTo(0, 0);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                          isActive ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-purple-50'
                        }`}
                      >
                        <span>{ft.icon}</span>
                        <span className="text-[13px] font-medium">{ft.label}</span>
                        <span className={`ml-auto text-[11px] ${isActive ? 'text-purple-200' : 'text-gray-400'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
