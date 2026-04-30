'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product, ProductCategory } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

const PER_PAGE = 24;

interface CategoryWithCount extends ProductCategory {
  count?: number;
}

interface TiendaClientProps {
  products: Product[];
  categories: CategoryWithCount[];
}

export default function TiendaClient({ products, categories: categoriesProp }: TiendaClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterOpen, setFilterOpen] = useState(false);

  // 从 products 动态提取完整分类列表（wc_categories.json 可能缺少部分分类）
  const categories = useMemo(() => {
    const catMap = new Map<number, ProductCategory & { count: number }>();
    for (const p of products) {
      for (const c of p.categories || []) {
        const existing = catMap.get(c.id);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          catMap.set(c.id, { ...c, count: 1 });
        }
      }
    }
    return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [products]);

  // Read params from URL — aligned with old site (orderby + order, not sort)
  // 现站默认排序：Precio: mayor a menor
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1');
  const orderby = searchParams.get('orderby') || 'date';
  const order = searchParams.get('order') || 'desc';

  const activeCategory = categories.find(c => String(c.id) === categoryParam);

  // Filter + sort + paginate
  const result = useMemo(() => {
    let filtered = [...products];

    // Category filter
    if (categoryParam) {
      filtered = filtered.filter(p =>
        p.categories?.some(c => String(c.id) === categoryParam)
      );
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

    // Sort — aligned with old site
    const mult = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (orderby) {
        case 'date':
          return mult * (new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
        case 'popularity':
          return mult * ((b.total_sales || 0) - (a.total_sales || 0));
        case 'price':
          return mult * (parseFloat(a.price || '0') - parseFloat(b.price || '0'));
        case 'title':
          return mult * a.name.localeCompare(b.name, 'es');
        default:
          return 0;
      }
    });

    // Paginate
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / PER_PAGE);
    const page = Math.max(1, Math.min(pageParam, totalPages));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return { paginated, totalCount, totalPages, page };
  }, [products, categoryParam, searchParam, orderby, order, pageParam]);

  // Update URL params — SPA-style navigation (no full page reload)
  const updateParam = useCallback((key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  // Smart page numbers with ellipsis
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
    <div className="min-h-screen bg-gray-50">
      {/* Top bar — sticky below header (header is ~56px) */}
      <div className="bg-white border-b border-gray-100 sticky top-[56px] z-10">
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
              {/* Sort — aligned with old site (orderby-order value, two params on change) */}
              <select
                value={`${orderby}-${order}`}
                onChange={e => {
                  const [ob, or] = e.target.value.split('-');
                  updateParam('orderby', ob);
                  updateParam('order', or);
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="date-desc">Más nuevos</option>
                <option value="popularity-desc">Más vendidos</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
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

          {/* Active filters */}
          {(categoryParam || searchParam) && (
            <div className="flex items-center gap-2 mt-2">
              {activeCategory && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {activeCategory.name}
                  <button onClick={() => updateParam('category', '')}><X size={12} /></button>
                </span>
              )}
              {searchParam && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  &quot;{searchParam}&quot;
                  <button onClick={() => updateParam('search', '')}><X size={12} /></button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar filters (desktop) — 1:1 现站 ShopPage.jsx L159-192 */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-bold text-sm mb-3">Categorías</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => updateParam('category', '')}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition ${
                      !categoryParam ? 'bg-[#2563eb] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Todas
                  </button>
                </li>
                {categories.filter(c => (c.count || 0) > 0).map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => updateParam('category', String(cat.id))}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition flex items-center justify-between ${
                        String(cat.id) === categoryParam
                          ? 'bg-[#2563eb] text-white font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className={`text-xs ${String(cat.id) === categoryParam ? 'text-blue-200' : 'text-gray-400'}`}>
                        {cat.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Product grid */}
          <main className="flex-1">
            {/* H1 */}
            <h1 className="text-2xl font-black text-gray-900 mb-5 px-1">
              {activeCategory
                ? `${activeCategory.name} - Mayorista Accesorios Móviles`
                : searchParam
                  ? `Resultados para "${searchParam}"`
                  : 'Catálogo de Accesorios Móviles al Mayor'}
            </h1>

            {result.paginated.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">No se encontraron productos</h2>
                <p className="text-gray-500 mb-4">Prueba con otros filtros o categorías</p>
                <button
                  onClick={() => router.push('/tienda')}
                  className="bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl"
                >
                  Ver todo
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">{result.totalCount} productos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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
    </div>
  );
}
