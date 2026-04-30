import type { Metadata } from 'next';
import TiendaClient from '@/components/TiendaClient';

// Client-side SPA behavior (same as old site) — products fetched in browser via useEffect.
// No SSR data fetching to avoid Vercel serverless timeout with 3.5MB products-raw payload.
export const dynamic = 'force-dynamic';

// Static metadata — old site is SPA so it also has fixed metadata.
// Category/search-specific meta is not possible without SSR data, which matches old site behavior.
export const metadata: Metadata = {
  title: 'Catálogo | GSMGC Canarias - Accesorios Móviles al Mayor',
  description: 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más. Envío 24h Canarias. Precios mayoristas B2B.',
  alternates: { canonical: 'https://gsmgc.es/tienda' },
  openGraph: {
    title: 'Catálogo | GSMGC Canarias - Accesorios Móviles al Mayor',
    description: 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más. Envío 24h Canarias. Precios mayoristas B2B.',
    url: 'https://gsmgc.es/tienda',
    siteName: 'GSMGC Canarias',
    locale: 'es_ES',
    type: 'website',
    images: [{ url: 'https://gsmgc.es/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catálogo | GSMGC Canarias - Accesorios Móviles al Mayor',
    description: 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más. Envío 24h Canarias. Precios mayoristas B2B.',
    images: ['https://gsmgc.es/og-image.png'],
  },
};

export default function TiendaPage() {
  return <TiendaClient categories={[]} />;
}
