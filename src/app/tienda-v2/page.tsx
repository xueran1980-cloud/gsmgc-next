import type { Metadata } from 'next';
import type { Product } from '@/lib/api';
import { TiendaClient } from '@/components/TiendaClient';

// ★ /tienda-v2 — SSR 首屏直接渲染商品（无 loading skeleton）
//    服务端 fetch products-paginated 初始数据
//    翻页/筛选/搜索走客户端 fetch /api/products-v2
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

export default async function TiendaV2Page() {
  let initialProducts: Product[] = [];
  let initialTotal = 0;

  try {
    // ★ SSR: 服务端直连后端分页 API，首屏数据注入 HTML
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
    // 优雅降级：客户端会自己 fetch
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
