import type { Metadata } from 'next';
import TiendaClient from '@/components/TiendaClient';

// ★ /tienda-old — 旧版客户端渲染（回滚用）
// Client-side SPA behavior — products fetched in browser via useEffect.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo (old) - GSMGC Accesorios Móvil Mayorista Canarias',
  description: 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más.',
  alternates: { canonical: 'https://gsmgc.es/tienda' },
  openGraph: {
    title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
    description: 'Catálogo completo de accesorios móviles al mayor.',
    url: 'https://gsmgc.es/tienda',
    siteName: 'GSMGC', locale: 'es_ES', type: 'website',
    images: [{ url: 'https://gsmgc.es/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias',
    description: 'Catálogo completo de accesorios móviles al mayor.',
    images: ['https://gsmgc.es/og-image.png'],
  },
};

export default function TiendaOldPage() {
  return <TiendaClient categories={[]} />;
}
