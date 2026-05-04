import type { Metadata } from 'next';
import type { Product } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';
import ProductCardSSR from '@/components/ProductCardSSR';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
  description: 'Catálogo completo de accesorios móviles al mayor.',
  alternates: { canonical: 'https://gsmgc.es/tienda' },
  openGraph: {
    title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
    description: 'Catálogo completo de accesorios móviles al mayor.',
    url: 'https://gsmgc.es/tienda', siteName: 'GSMGC', locale: 'es_ES', type: 'website',
    images: [{ url: 'https://gsmgc.es/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image', title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
    description: 'Catálogo completo de accesorios móviles al mayor.',
    images: ['https://gsmgc.es/og-image.png'],
  },
};

export default async function TiendaV2Page() {
  let initialProducts: Product[] = [];
  let initialTotal = 0;

  try {
    const res = await fetch(
      'https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?per_page=24&page=1&orderby=price&order=desc',
      { headers: { 'User-Agent': 'GSMGC-Next-Server/1.0', 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.products)) {
        initialProducts = json.products;
        initialTotal = json.total || 0;
      }
    }
  } catch (err) {
    console.error('[tienda-v2 SSR] fetch failed:', (err as Error).message);
  }

  return (
    <>
      {/* ★ SSR 预渲染产品卡片 — HTML 直出，水合后由 TiendaClient 移除 */}
      <div id="ssr-grid">
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex gap-6">
              <div className="hidden lg:block w-60 shrink-0" />
              <main className="flex-1">
                <h1 className="text-2xl font-black text-gray-900 mb-5 px-1">Catálogo de Accesorios Móviles al Mayor</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                  {initialProducts.map((p) => (
                    <ProductCardSSR key={p.id} product={p} />
                  ))}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* ★ 客户端交互组件 — 水合后接管 */}
      <TiendaClient
        initialProducts={initialProducts}
        initialTotal={initialTotal}
        initialPage={1}
        apiEndpoint="/api/products-v2"
      />
    </>
  );
}
