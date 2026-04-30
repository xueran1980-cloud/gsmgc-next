import { Suspense } from 'react';
import type { Metadata } from 'next';
import { fetchProducts, fetchCategories } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';

// Dynamic rendering: fetch products at request time, not build time.
// CF Bot Fight Mode blocks Vercel build IPs (error 1010).
export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

// Dynamic metadata based on search params
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category || '';
  const search = params.search || '';

  const products = await fetchProducts();
  const categories = await fetchCategories();

  let title = 'Catálogo - GSMGC Accesorios Móvil Mayorista Canarias';
  let description = 'Catálogo completo de accesorios móviles al mayor: pantallas, fundas, baterías, cargadores y más. Envío 24h Canarias. Precios mayoristas B2B.';
  let canonical = 'https://gsmgc.es/tienda';

  if (category) {
    const cat = categories.find(c => String(c.id) === category);
    if (cat) {
      title = `${cat.name} - Mayorista Accesorios Móviles`;
      description = `${cat.name} al por mayor - Mayorista accesorios móviles Canarias. Envío 24h a Gran Canaria y Tenerife. +2.100 productos B2B.`;
      canonical = `https://gsmgc.es/tienda?category=${category}`;
    }
  } else if (search) {
    title = `Buscar: "${search}"`;
    description = `Resultados de búsqueda para "${search}" en accesorios móviles al mayor. Envío 24h Canarias.`;
    canonical = `https://gsmgc.es/tienda`;
  }

  // Search results should not be indexed (avoid low-quality search URLs in SERPs)
  const isSearch = !!search;

  return {
    title,
    description,
    alternates: { canonical },
    robots: isSearch
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: `${title}`,
      description,
      url: canonical,
      siteName: 'GSMGC Canarias',
      locale: 'es_ES',
      type: 'website',
      images: [{ url: 'https://gsmgc.es/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title}`,
      description,
      images: ['https://gsmgc.es/og-image.png'],
    },
  };
}

// Loading skeleton
function TiendaLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
            <div className="h-9 bg-gray-200 rounded-lg w-40 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="h-7 bg-gray-200 rounded w-80 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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

export default async function TiendaPage() {
  const products = await fetchProducts();
  const categories = await fetchCategories();

  return (
    <Suspense fallback={<TiendaLoading />}>
      <TiendaClient products={products} categories={categories} />
    </Suspense>
  );
}
