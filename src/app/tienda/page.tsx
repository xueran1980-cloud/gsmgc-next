import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { Product } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';

// ISR revalidate=600s — CF HTML cache 5min, ISR 对齐避免浪费 CPU
// 所有筛选/搜索/翻页由 TiendaClient 客户端处理
export const revalidate = 600;

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

// ★ 不使用 searchParams prop（否则 Next.js 忽略 ISR，强制 no-store）
// ★ 始终渲染默认视图，客户端 TiendaClient 读取 URL 参数后自行 fetch
export default async function TiendaPage() {
  let initialProducts: Product[] = [];
  let initialTotal = 0;

  // ISR fetch — 默认排序 + 1次重试（应对 CF Bot Fight Mode）
  const backendUrl = 'https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?per_page=24&page=1&orderby=price&order=desc';
  const fetchOpts = { headers: { 'User-Agent': 'GSMGC-Next-Server/1.0', 'Accept': 'application/json' }, next: { revalidate: 600 } };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(backendUrl, fetchOpts);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.products) && json.products.length > 0) {
          initialProducts = json.products;
          initialTotal = json.total || 0;
          break;
        }
        if (json.success && Array.isArray(json.products)) {
          initialProducts = [];
          initialTotal = 0;
          break;
        }
      }
      if (attempt === 0) {
        console.warn('[tienda ISR] fetch failed, retrying...');
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      if (attempt === 0) {
        console.warn('[tienda ISR] fetch exception, retrying:', (err as Error).message);
        await new Promise(r => setTimeout(r, 200));
      } else {
        console.error('[tienda ISR] fetch failed after retry:', (err as Error).message);
      }
    }
  }

  return (
    <Suspense fallback={<TiendaSkeleton />}>
    <TiendaClient
      initialProducts={initialProducts}
      initialTotal={initialTotal}
      initialPage={1}
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
