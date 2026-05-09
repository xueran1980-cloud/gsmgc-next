// GSMGC Product Detail Page
// Route: /producto/[id]/[slug]
// ★ SSR 动态渲染，实时数据（禁止 SSG）

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ChevronRight,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  fetchProductById, fetchProducts, generateSlug, type Product,
} from '@/lib/api';
import ImageGallery from '@/components/ImageGallery';
import ShareButton from '@/components/ShareButton';
import ProductDetailActions from './ProductDetailActions';
import ProductCard from '@/components/ProductCard';

// ★ 强制动态渲染（SSR），禁止 SSG/SSG
export const dynamic = 'force-dynamic';

// ---------- Metadata ----------

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);
  if (!product) return {};

  const canonicalUrl = `https://gsmgc.es/producto/${product.id}/${generateSlug(product.name) || 'producto'}`;
  const title = product.name;
  const desc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim().slice(0, 160)
    : `Compra ${product.name} al mayor. SKU: ${product.sku || 'N/A'} para profesionales en Canarias. Envío 24h, garantía 6 meses.`;
  const ogImage = product.images?.[0]?.src || '/og-image.png';

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

async function getProductById(id: string): Promise<{ product: Product | null; related: Product[] }> {
  const product = await fetchProductById(id);
  if (!product) return { product: null, related: [] };

  // Related Products：从 fetchProducts() 获取（直连 api.gsmgc.es）
  let related: Product[] = [];
  const categoryId = product.categories?.[0]?.id;
  if (categoryId) {
    try {
      const allProducts = await fetchProducts();
      related = allProducts
        .filter((p) => p.categories?.some((c) => c.id === categoryId) && String(p.id) !== id)
        .slice(0, 6);
    } catch (err) {
      console.warn('[getProductById] Failed to get related:', err);
    }
  }

  return { product, related };
}

// ---------- Page ----------

export default async function ProductPage({ params }: PageProps) {
  const { id, slug } = await params;
  const { product, related } = await getProductById(id);

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
  // ★ 双重检查：stock_status + stock_quantity（与 ProductDetailActions 一致）
  const statusInstock = product.stock_status === 'instock';
  const isActuallyOutOfStock = statusInstock
    && product.stock_quantity !== null
    && product.stock_quantity !== undefined
    && parseInt(String(product.stock_quantity)) <= 0;
  const inStock = statusInstock && !isActuallyOutOfStock;
  const hasDiscount = parseFloat(product.regular_price) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.regular_price)) * 100)
    : 0;
  const categoryName = product.categories?.[0]?.name || 'Catálogo';
  const categoryId = product.categories?.[0]?.id || '';
  const canonicalUrl = `https://gsmgc.es/producto/${id}/${expectedSlug}`;

  // WhatsApp message - aligned with old site
  const waMsg = encodeURIComponent(
    `Hola! Me interesa este producto:\n\n📱 ${(product.name || 'Producto')}\n💰 Precio: €${(product.price || '0')}\n🔗 ${canonicalUrl}\n\n¿Tienen stock disponible?`
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
    image: images.length > 0 ? images.map((img) => img.src) : ['/og-image.png'],
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
            <a href="/tienda" className="hover:text-[#2563eb] transition">Catálogo</a>
            {product.categories?.[0] && (
              <>
                <ChevronRight size={13} className="text-gray-300" />
                <a
                  href={`/tienda?category=${product.categories[0].slug}`}
                  className="hover:text-[#2563eb] transition"
                >
                  {product.categories[0].name}
                </a>
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
                  <a
                    key={c.id}
                    href={`/tienda?category=${c.slug}`}
                    className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full hover:bg-blue-100 transition"
                  >
                    {c.name}
                  </a>
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

            {/* Price + Stock + Cart — 根据登录状态显示不同内容（客户端组件） */}
            <ProductDetailActions product={product} waMsg={waMsg} />

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

            {/* Description */}
            {product.description && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-base mb-3 text-gray-900">Descripción del producto</h3>
                <div
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {/* Short description */}
            {product.short_description && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div
                  className="text-sm text-gray-500 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.short_description }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900">Productos relacionados</h2>
              {product.categories?.[0] && (
                <a
                  href={`/tienda?category=${product.categories[0].slug}`}
                  className="text-sm text-[#2563eb] font-semibold hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={15} />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
