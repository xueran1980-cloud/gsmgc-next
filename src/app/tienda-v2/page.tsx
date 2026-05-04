import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { Product } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';

// ★ /tienda-v2 — SSR 首屏直接渲染商品（无 loading skeleton）
//    Suspense 包裹异步数据获取，消除 hydration mismatch (#418)
//    与 /tienda 完全独立 → 不影响现站

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

export default function TiendaV2Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
      </div>
    }>
      <TiendaV2Async />
    </Suspense>
  );
}

/** ★ 异步数据获取在 Suspense 内部，服务端和客户端渲染一致 */
async function TiendaV2Async() {
  let initialProducts: Product[] = [];
  let initialTotal = 0;

  try {
    const res = await fetch(
      'https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?per_page=24&page=1&orderby=price&order=desc',
      {
        headers: {
          'User-Agent': 'GSMGC-Next-Server/1.0',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
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
    <TiendaClient
      initialProducts={initialProducts}
      initialTotal={initialTotal}
      initialPage={1}
      apiEndpoint="/api/products-v2"
    />
  );
}
