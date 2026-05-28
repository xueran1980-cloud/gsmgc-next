import type { Metadata } from 'next';
import TiendaClient from '@/components/TiendaClient';

// ★ 纯客户端 — 产品数据浏览器直连 WP API，Vercel 不预取
//   实时价格/库存，零 Vercel CPU

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

export default function TiendaPage() {
  return (
    <TiendaClient
      initialProducts={[]}
      initialTotal={0}
      initialPage={1}
      apiEndpoint="/api/products-v2"
    />
  );
}
