import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ChevronRight,
  Package,
  ShieldCheck,
  Truck,
  MessageCircle,
} from 'lucide-react';
import { fetchProducts, generateSlug, type Product } from '@/lib/api';
import ImageGallery from '@/components/ImageGallery';
import ShareButton from '@/components/ShareButton';

// ---------- Static Params ----------

export async function generateStaticParams() {
  const products = await fetchProducts();
  return products
    .filter((p) => p.status === 'publish')
    .map((p) => ({
      id: String(p.id),
      slug: generateSlug(p.name) || 'producto',
    }));
}

// ---------- Metadata ----------

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};

  const canonicalUrl = `https://gsmgc.es/producto/${product.id}/${generateSlug(product.name) || 'producto'}`;
  const title = product.name;
  const desc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim().slice(0, 160)
    : `Compra ${product.name} al mayor. SKU: ${product.sku || 'N/A'} para profesionales en Canarias. Envío 24h, garantía 6 meses.`;
  const ogImage = product.images?.[0]?.src || 'https://gsmgc.es/og-image.png';
  const categoryName = product.categories?.[0]?.name || 'Catálogo';

  return {
    title,
    description: desc,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${product.name} | GSMGC Canarias`,
      description: `Mayorista ${product.name}. SKU: ${product.sku || 'N/A'}. Envío 24h Canarias. Precios B2B.`,
      url: canonicalUrl,
      images: [{ url: ogImage, width: 800, height: 800 }],
      type: 'website',
      siteName: 'GSMGC Canarias',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | GSMGC Canarias`,
      description: `Compra ${product.name} al mayor. SKU: ${product.sku}. Envío a Canarias.`,
      images: [ogImage],
    },
  };
}

// ---------- Data ----------

async function getProductById(id: string): Promise<Product | null> {
  const products = await fetchProducts();
  return products.find((p) => p.id === parseInt(id)) || null;
}

// ---------- Page ----------

export default async function ProductPage({ params }: PageProps) {
  const { id, slug } = await params;
  const product = await getProductById(id);

  // 404 if not found
  if (!product) {
    notFound();
  }

  // Redirect /producto/[id] → /producto/[id]/[slug] for SEO
  const expectedSlug = generateSlug(product.name) || 'producto';
  if (!slug || slug !== expectedSlug) {
    redirect(`/producto/${id}/${expectedSlug}`);
  }

  // Derive data
  const images = product.images || [];
  const inStock = product.stock_status === 'instock';
  const hasDiscount = parseFloat(product.regular_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.regular_price)) * 100)
    : 0;
  const categoryName = product.categories?.[0]?.name || 'Catálogo';
  const categoryId = product.categories?.[0]?.id || '';
  const canonicalUrl = `https://gsmgc.es/producto/${id}/${expectedSlug}`;

  // WhatsApp message
  const waMsg = encodeURIComponent(
    `Hola, estoy interesado en el producto: ${product.name} (SKU: ${product.sku || 'N/A'}) - ${canonicalUrl}`
  );

  // Clean description for JSON-LD
  const cleanDesc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim()
    : `Accesorio para móvil ${product.name}. SKU: ${product.sku || 'N/A'}. Mayorista B2B Canarias.`;

  // JSON-LD: Product
  const jsonLdProduct = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: images.length > 0 ? images.map((img) => img.src) : ['https://gsmgc.es/og-image.png'],
    description: cleanDesc,
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { '@type': 'Brand', name: 'GSMGC' },
    manufacturer: { '@type': 'Organization', name: 'GSMGC Accesorios Móvil' },
    category: categoryName,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'EUR',
      price: parseFloat(product.price || '0').toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      seller: {
        '@type': 'Organization',
        name: 'GSMGC Accesorios Móvil',
        telephone: '+34-688-560-560',
      },
      deliveryLeadTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
    },
  };

  // JSON-LD: Breadcrumb
  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://gsmgc.es' },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: 'https://gsmgc.es/tienda' },
      ...(categoryId
        ? [{ '@type': 'ListItem', position: 3, name: categoryName, item: `https://gsmgc.es/tienda?category=${categoryId}` }]
        : []),
      { '@type': 'ListItem', position: categoryId ? 4 : 3, name: product.name },
    ],
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-[#2563eb] transition">Inicio</Link>
            <ChevronRight size={13} className="text-gray-300" />
            <Link href="/tienda" className="hover:text-[#2563eb] transition">Catálogo</Link>
            {product.categories?.[0] && (
              <>
                <ChevronRight size={13} className="text-gray-300" />
                <Link
                  href={`/tienda?category=${product.categories[0].id}`}
                  className="hover:text-[#2563eb] transition"
                >
                  {product.categories[0].name}
                </Link>
              </>
            )}
            <ChevronRight size={13} className="text-gray-300" />
            <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product detail */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <ImageGallery
              images={images}
              productName={product.name}
              hasDiscount={hasDiscount}
              discountPct={discountPct}
            />
          </div>

          {/* Details */}
          <div>
            {/* Category tags */}
            {product.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {product.categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/tienda?category=${c.id}`}
                    className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full hover:bg-blue-100 transition"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Title + Share */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight flex-1">
                {product.name}
              </h1>
              <ShareButton productName={product.name} url={canonicalUrl} />
            </div>

            {/* SKU */}
            {product.sku && (
              <div className="text-sm text-gray-400 font-mono mb-4">SKU: {product.sku}</div>
            )}

            {/* Price block */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-5 mb-6">
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-4xl font-black text-[#2563eb]">
                  €{parseFloat(product.price || '0').toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-gray-300 line-through mb-0.5">
                    €{parseFloat(product.regular_price).toFixed(2)}
                  </span>
                )}
                <span className="text-gray-400 text-sm mb-1">+ IVA/IGIC</span>
              </div>
              {hasDiscount && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#ea580c]/10 text-[#ea580c] text-sm font-bold px-3 py-1 rounded-full">
                  Ahorras €{(parseFloat(product.regular_price) - parseFloat(product.price)).toFixed(2)} ({discountPct}% dto.)
                </div>
              )}
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-2 mb-5">
              {inStock ? (
                <>
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                  <span className="text-green-700 font-semibold text-sm">En stock</span>
                  {product.stock_quantity !== null && product.stock_quantity !== undefined && (
                    <span className={`text-sm font-medium ${
                      product.stock_quantity <= 5 ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      · {product.stock_quantity <= 5
                        ? `¡Solo quedan ${product.stock_quantity}!`
                        : `${product.stock_quantity} unidades`
                      }
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 bg-red-400 rounded-full shrink-0" />
                  <span className="text-red-600 font-semibold text-sm">Sin stock</span>
                  <span className="text-gray-400 text-sm">· Consultar disponibilidad por WhatsApp</span>
                </>
              )}
            </div>

            {/* Min quantity notice */}
            {product.min_qty > 1 && inStock && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
                Cantidad mínima de compra: <strong>{product.min_qty} unidades</strong>
              </div>
            )}

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/34688560560?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#25d366] text-[#128c7e] font-semibold hover:bg-[#25d366]/5 transition mb-6 text-sm"
            >
              <MessageCircle size={18} />
              {inStock ? 'Consultar por WhatsApp' : 'Pedir cuando haya stock'}
            </a>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: Truck, text: 'Envío 24h', sub: 'a Canarias' },
                { icon: ShieldCheck, text: 'Garantía', sub: '6 meses' },
                { icon: Package, text: 'Recogida', sub: 'en local' },
              ].map(({ icon: Icon, text, sub }) => (
                <div key={text} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                  <Icon size={20} className="text-[#2563eb]" />
                  <span className="text-xs font-bold text-gray-700">{text}</span>
                  <span className="text-[10px] text-gray-400">{sub}</span>
                </div>
              ))}
            </div>

            {/* Short description */}
            {product.short_description && (
              <div className="border-t border-gray-100 pt-4">
                <div
                  className="text-sm text-gray-500 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.short_description }}
                />
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t border-gray-100 pt-6 mt-4">
                <h2 className="font-bold text-base mb-3 text-gray-900">Descripción del producto</h2>
                <div
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
