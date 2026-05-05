import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { Product } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';

// ★ /tienda — SSR 首屏直接渲染商品（无 loading skeleton）
//    服务端 fetch products-paginated 初始数据
//    翻页/筛选/搜索走客户端 fetch /api/products-v2
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
  description: 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más. Envío 24h Canarias. Precios mayoristas B2B.',
  alternates: { canonical: 'https://gsmgc.es/tienda' },
  openGraph: {
    title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
    description: 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más. Envío 24h Canarias.',
    url: 'https://gsmgc.es/tienda',
    siteName: 'GSMGC',
    locale: 'es_ES',
    type: 'website',
    images: [{ url: 'https://gsmgc.es/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
    description: 'Catálogo completo de accesorios móviles al mayor.',
    images: ['https://gsmgc.es/og-image.png'],
  },
};

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const category = sp.category || '';
  const search = sp.search || '';
  const page = sp.page || '1';

  let initialProducts: Product[] = [];
  let initialTotal = 0;

  try {
    const backendParams = new URLSearchParams();
    backendParams.set('per_page', '24');
    backendParams.set('page', page);
    backendParams.set('orderby', sp.orderby || 'price');
    backendParams.set('order', sp.order || 'desc');
    if (category) backendParams.set('category', category);
    if (search) backendParams.set('search', search);

    const res = await fetch(
      `https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?${backendParams.toString()}`,
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
    console.error('[tienda SSR] fetch failed:', (err as Error).message);
  }

  return (
    <Suspense fallback={<TiendaSkeleton />}>
    <TiendaClient
      initialProducts={initialProducts}
      initialTotal={initialTotal}
      initialPage={parseInt(page) || 1}
      apiEndpoint="/api/products-v2"
    />
    </Suspense>
  );
}

// ★ RSC Suspense fallback — 匹配 TiendaClient loading skeleton
function TiendaSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
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
      </div>
    </div>
  );
}
