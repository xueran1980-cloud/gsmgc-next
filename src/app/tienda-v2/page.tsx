import type { Metadata } from 'next';
import type { Product } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';

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

export default async function TiendaV2Page({
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
    console.error('[tienda-v2 SSR] fetch failed:', (err as Error).message);
  }

  return (
    <TiendaClient
      initialProducts={initialProducts}
      initialTotal={initialTotal}
      initialPage={parseInt(page) || 1}
      apiEndpoint="/api/products-v2"
    />
  );
}
