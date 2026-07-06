'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product, ProductCategory } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { BRAND_CATEGORY_NAMES, EXCLUDED_CATEGORY_NAMES } from '@/config/category-config';
import { useAsyncState } from '@/hooks/useAsyncState';

const PER_PAGE = 24;

/**
 * 搜索关键词高亮（对齐旧站）
 */
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight || !text) return <>{text}</>;
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

export default function TiendaClient({
  categories: categoriesProp,
  apiEndpoint = '/api/products',
  initialProducts,
  initialTotal,
  initialPage,
}: {
  categories?: ProductCategory[];
  apiEndpoint?: string;
  initialProducts?: Product[];
  initialTotal?: number;
  initialPage?: number;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(!(initialProducts && initialProducts.length > 0));
  const [totalCount, setTotalCount] = useState(initialTotal || 0);
  const [totalPages, setTotalPages] = useState(initialTotal ? Math.ceil(initialTotal / PER_PAGE) : 0);

  // ★ SSR 水合：有初始数据 + 无筛选 → 直接用，跳过 fetch
  const ssrReady = useRef(!!(initialProducts && initialProducts.length > 0));

  // ★ 请求 ID 计数器 — 防止旧请求结果覆盖新请求（竞态保护）
  const fetchRequestId = useRef(0);

  // ★ Safari Router 冻结自愈：防止连续点击触发重复导航
  const navigationLockRef = useRef(false);

  // ★ 可终止异步状态机 — 15s timeout + abort + auto retry + unmount guard
  const search = useAsyncState<void>();
  useEffect(() => {
    if (ssrReady.current) {
      ssrReady.current = false;
      setLoading(false);
      return;
    }
    // 无初始数据 → 走正常 fetch 流程（与旧版 /tienda 相同）
  }, []);

  // Read params from URL — ★ 对齐旧站默认：Precio: mayor a menor (price-desc)
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const orderby = searchParams.get('orderby');
  const order = searchParams.get('order');
  const finalOrderby = orderby || 'price'; // ★ 旧站默认：price-desc
  const finalOrder = order || 'desc';

  // ★ URL 为唯一真相源 — fetch 只依赖 searchParams，无中间状态

  // ★ URL 驱动导航：只修改 URL，不合成状态
  const buildUrl = (updates: Record<string, string | null>, clear?: string[]) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (clear) clear.forEach(k => p.delete(k));
    return p.toString() ? `${pathname}?${p}` : pathname;
  };

  // ★ Safari Router 冻结自愈：router.replace 失败时 800ms 硬导航 fallback
  const safeReplace = (url: string) => {
    if (!url.startsWith('/')) return;        // ★ 防御：拒绝非站内路径
    if (navigationLockRef.current) return;
    const before = window.location.href;
    const targetUrl = new URL(url, window.location.origin).href;
    if (before === targetUrl) return;         // ★ 同 URL 不触发
    navigationLockRef.current = true;
    router.replace(url, { scroll: false });
    let checked = false;
    const check = () => {
      if (checked) return;
      checked = true;
      if (window.location.href === before) {
        window.location.assign(url);
      }
      navigationLockRef.current = false;
    };
    setTimeout(check, 800);
    requestAnimationFrame(() => setTimeout(check, 200));
  };

  const setCategory = useCallback((slug: string) => {
    safeReplace(buildUrl({ category: slug }, ['page', 'search']));
  }, [searchParams, pathname, router]);

  const setPage = useCallback((n: number) => {
    safeReplace(buildUrl({ page: String(n) }));
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, [searchParams, pathname, router]);

  const resetAll = useCallback(() => {
    safeReplace(pathname);
  }, [router, pathname]);

  // ★ 独立获取分类（不受 SSR 跳过影响）
  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then(r => r.json())
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch((err: unknown) => {
        console.error('[TiendaClient] categories fetch failed:', err);
      });
  }, []);

  // ★ useEffect：URL (searchParams) 为唯一状态源，URL 变化时 fetch
  //    通过 useAsyncState 管理 fetch 生命周期：15s timeout + abort + auto retry + unmount guard
  useEffect(() => {
    console.log('[TIENDA render]', JSON.stringify({
      pathname: pathname,
      search: searchParams.toString(),
      href: window.location.href,
      ts: Math.floor(performance.now())
    }));

    const category = searchParams.get('category') || '';
    const searchTerm = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

    // ★ 有筛选条件时立即显示 loading
    if (category || searchTerm || page > 1) {
      setLoading(true);
    }

    const orderby = searchParams.get('orderby') || 'price'; // ★ 旧站默认：price-desc
    const order = searchParams.get('order') || 'desc';

    const params = new URLSearchParams();
    params.set('orderby', orderby);
    params.set('order', order);
    if (category) params.set('category', category);
    if (searchTerm) params.set('search', searchTerm);
    params.set('per_page', String(PER_PAGE));
    params.set('page', String(page));

    // ★ 构建请求 headers：透传 Bearer token 给 /api/products → WP 后端
    const fetchHeaders: Record<string, string> = {};
    try {
      const token = localStorage.getItem('gsmgc_auth_token');
      if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;
    } catch {}

    // ★ 客户端直连后端（绕过 Vercel 代理避免 CF Bot Fight Mode 拦截）
    const directUrl = `https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?${params.toString()}`;

    search.run(async (signal) => {
      const thisId = ++fetchRequestId.current;
      try {
        const res = await fetch(directUrl, {
          headers: fetchHeaders,
          cache: 'no-store',
          signal,
        });
        const prodData = await res.json();

        // ★ 防止旧请求结果覆盖新请求
        if (thisId !== fetchRequestId.current) return;

        // ★ 兼容两种响应格式: Vercel代理(camelCase) + 后端直连(snake_case)
        if (prodData && Array.isArray(prodData.products)) {
          setProducts(prodData.products);
          setTotalCount(prodData.totalCount || prodData.total || prodData.products.length);
          setTotalPages(prodData.totalPages || prodData.total_pages || 1);
        } else if (Array.isArray(prodData)) {
          // 兼容旧格式（纯数组）
          setProducts(prodData);
          setTotalCount(prodData.length);
          setTotalPages(1);
        } else {
          setProducts([]);
          setTotalCount(0);
          setTotalPages(0);
        }
        setLoading(false);
      } catch (_err) {
        // ★ 只有最新请求才清 loading（防竞态）
        if (thisId === fetchRequestId.current) {
          setLoading(false);
        }
      }
    });

    // ★ 依赖变化时中止当前请求（不标记卸载，让下次 run 正常工作）
    return () => {
      search.abort();
    };
  // 依赖 searchParams.toString() 确保任何参数变化都触发
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // ★ 组件卸载时完整清理
  useEffect(() => {
    return () => {
      search._unmount.current();
    };
  }, []);

  // ★ activeCategory — 同时匹配 id 和 slug（对齐旧站）
  const safeCategories = Array.isArray(categories) ? categories : [];
  const activeCategory = safeCategories.find(c =>
    String(c.id) === categoryParam ||
    (c.slug || '').toLowerCase() === categoryParam.toLowerCase()
  );

  // Marcas — ★ 对齐现站：仅白名单内的品牌
  const brandCategories = [...safeCategories]
    .filter(c => {
      if ((c.count ?? 0) <= 0) return false;
      const slug = (c.slug || '').toLowerCase();
      if (EXCLUDED_CATEGORY_NAMES.has(slug)) return false;
      return BRAND_CATEGORY_NAMES.has(slug);
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  // Tipo de Producto — ★ 其余所有根分类 + 子分类
  const realCategories = [...safeCategories]
    .filter(c => {
      if ((c.count ?? 0) <= 0) return false;
      const slug = (c.slug || '').toLowerCase();
      if (EXCLUDED_CATEGORY_NAMES.has(slug)) return false;
      if (BRAND_CATEGORY_NAMES.has(slug)) return false;
      return true;
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  // Smart page numbers with ellipsis（对齐旧站）
  function renderPagination() {
    if (totalPages <= 1) return null;
    const page = pageParam;
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
            onClick={() => setPage(p)}
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
              {/* Sort — ★ 对齐旧站：price-desc 默认，顺序匹配 */}
              <select
                value={`${finalOrderby}-${finalOrder}`}
                onChange={e => {
                  const [ob, or] = e.target.value.split('-');
                  const params = new URLSearchParams(searchParams.toString());
                  if (categoryParam) params.set('category', categoryParam);
                  if (searchParam) params.set('search', searchParam);
                  params.set('orderby', ob);
                  params.set('order', or);
                  params.delete('page');
                  safeReplace(`${pathname}?${params.toString()}`);
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
          {/* Sidebar filters (desktop) — Marcas + Categorías */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-[calc(var(--header-offset,64px)+1rem)]">
              {/* ── Marcas（品牌）─ ─ */}
              <div className="mb-5">
                <h3 className="font-bold text-sm text-gray-800 mb-2.5 tracking-tight">Marcas</h3>
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                  <button
                    onClick={() => resetAll()}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                      !categoryParam
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
                          setCategory(brandSlug);
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
                      onClick={() => resetAll()}
                      className="ml-auto underline hover:no-underline"
                    >Limpiar</button>
                  </p>
                )}
              </div>

              {/* ── Categorías（真实分类）─ ─ */}
              {realCategories.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="font-bold text-sm text-gray-800 mb-2.5 tracking-tight">Categorías</h3>
                  <div className="space-y-0.5 max-h-64 overflow-y-auto pr-0.5 scrollbar-thin">
                    {realCategories.map(cat => {
                      const catSlug = (cat.slug || String(cat.id)).toLowerCase();
                      const isActive = catSlug === categoryParam || (cat.slug || '').toLowerCase() === (categoryParam || '').toLowerCase();
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(catSlug)}
                          className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                            isActive
                              ? 'bg-[#2563eb] text-white font-semibold'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-[#2563eb]'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          <span className={`ml-1.5 text-[10px] shrink-0 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 快速统计（对齐旧站格式） */}
              <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">
                {totalCount > 0 ? `${totalCount} productos` : ''}{searchParam ? ` · "${searchParam}"` : ''}
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
                  ? `${activeCategory.name}`
                  : 'Catálogo de Accesorios Móviles al Mayor'}
            </h1>

            {loading && (!initialProducts || initialProducts.length === 0) ? (
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
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">{'🔍'}</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">No se encontraron productos</h2>
                <p className="text-gray-500 mb-4">Prueba con otros filtros o categorías</p>
                <button
                  onClick={() => resetAll()}
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
                    ? <>{totalCount} resultado{totalCount !== 1 ? 's' : ''} para "<span className="font-medium text-gray-700">{searchParam}"</span></>
                    : `${totalCount} productos`
                  }
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setPage(pageParam - 1)}
                      disabled={pageParam <= 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {renderPagination()}
                    <button
                      onClick={() => setPage(pageParam + 1)}
                      disabled={pageParam >= totalPages}
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

      {/* ★ Mobile bottom sheet filter drawer（仅保留 Marcas） */}
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
                      resetAll();
                      setFilterOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      !categoryParam ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >Todas</button>
                  {brandCategories.map(brand => {
                    const brandSlug = (brand.slug || brand.name || '').toLowerCase();
                    const isActive = brandSlug === (categoryParam || '').toLowerCase();
                    return (
                      <button
                        key={brand.id}
                        onClick={() => {
                          setCategory(brandSlug);
                          setFilterOpen(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                          isActive ? 'bg-[#2563eb] text-white' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                        }`}
                      >{brand.name}</button>
                    );
                  })}
                </div>
              </div>

              {/* Categorías section（mobile） */}
              {realCategories.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-2.5">Categorías</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {realCategories.map(cat => {
                      const catSlug = (cat.slug || String(cat.id)).toLowerCase();
                      const isActive = catSlug === categoryParam || (cat.slug || '').toLowerCase() === (categoryParam || '').toLowerCase();
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setCategory(catSlug);
                            setFilterOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                            isActive ? 'bg-[#2563eb] text-white' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
