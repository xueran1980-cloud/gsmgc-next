import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import ShareButton from "@/components/ShareButton";
import { getDisplayPrice } from "@/lib/display-formatter";
import { resolveImageUrl } from "@/lib/image";
import { PriceOrLoginPrompt } from "@/components/PriceOrLoginPrompt";
import ProductDetailActions from "./ProductDetailActions";

// ── 数据 ──

async function getProduct(id: string) {
  try {
    const res = await fetch(
      `https://api.gsmgc.es/wp-json/gsmgc/v1/products-raw`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const products = data.products || data;
    return products.find((p: any) => String(p.id) === id) || null;
  } catch {
    return null;
  }
}

// ── SEO ──

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Producto no encontrado" };

  const desc = product.short_description ||
    product.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    `SKU: ${product.sku || id}`;
  const canonicalUrl = `https://gsmgc.es/producto/${product.id}/${product.slug}`;

  return {
    title: product.name,
    description: typeof desc === "string" ? desc.slice(0, 160) : "",
    openGraph: {
      title: product.name,
      description: typeof desc === "string" ? desc.slice(0, 160) : "",
      url: canonicalUrl,
      images: product.images?.length > 0
        ? [{ url: resolveImageUrl(product.images[0].src) }]
        : [],
    },
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
  };
}

// ── 页面 ──

export default async function ProductDetailPage({ params }: Props) {
  const { id, slug } = await params;
  const product = await getProduct(id);

  if (!product || product.slug !== slug) notFound();

  const desc = (product.short_description ||
    product.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    `SKU: ${product.sku || id}`) as string;

  const dp = getDisplayPrice(
    String(product.price ?? 0),
    String(product.regular_price ?? "")
  );

  const inStock = product.stock_status === "instock";

  // WhatsApp message
  const waPrice = Number(product.price ?? 0);
  const canonicalUrl = `https://gsmgc.es/producto/${product.id}/${product.slug}`;
  const waMsg = encodeURIComponent(
    `Hola! Me interesa este producto:\n\n📱 ${(product.name || 'Producto')}\n💰 Precio: €${waPrice.toFixed(2)}\n🔗 ${canonicalUrl}\n\n¿Tienen stock disponible?`
  );

  const adaptedProduct = {
    ...product,
    price: String(product.price ?? 0),
    regular_price: String(product.regular_price ?? 0),
    stock_status: product.stock_status || (inStock ? "instock" : "outofstock"),
    min_qty: product.min_qty || 1,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        <a href="/" className="hover:text-[#2563eb] transition">Inicio</a>
        <span>/</span>
        <a href="/tienda" className="hover:text-[#2563eb] transition">Tienda</a>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Image ── */}
        <div>
          <ImageGallery
            images={product.images || []}
            productName={product.name}
            hasDiscount={dp.showBadge}
            discountPct={dp.discountPct}
          />
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>

          {product.sku && (
            <span className="text-sm text-gray-400 mb-4">
              SKU: {product.sku}
            </span>
          )}

          {/* Price — client-side auth guard */}
          <div className="mb-6">
            <PriceOrLoginPrompt
              price={String(product.price ?? 0)}
              regularPrice={String(product.regular_price ?? "")}
            />
          </div>

          {/* Stock */}
          <div className="mb-6">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                En stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-500 font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Agotado
              </span>
            )}
          </div>

          {/* Product Actions — shopping button + WhatsApp  */}
          <div className="mb-6">
            <ProductDetailActions product={adaptedProduct} waMsg={waMsg} />
          </div>

          {/* Share */}
          <div className="mb-6">
            <ShareButton productName={product.name} url={canonicalUrl} />
          </div>

          {/* Short Description */}
          {product.short_description && (
            <div
              className="text-gray-600 text-sm leading-relaxed mb-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.short_description }}
            />
          )}

          {/* Attributes (if any) */}
          {product.attributes?.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Características
              </h3>
              <dl className="grid grid-cols-1 gap-1">
                {product.attributes.map((attr: { name: string; value: string }) => (
                  <div key={attr.name} className="flex text-sm">
                    <dt className="text-gray-400 w-32 shrink-0">{attr.name}:</dt>
                    <dd className="text-gray-700">{attr.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Full Description */}
      {product.description && (
        <div className="mt-12 border-t border-gray-100 pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Descripción
          </h2>
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      {/* JSON-LD structured data (SEO — no price to protect B2B pricing) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: typeof desc === "string" ? desc.slice(0, 300) : "",
            image: product.images?.[0]?.src
              ? resolveImageUrl(product.images[0].src)
              : undefined,
            sku: product.sku || undefined,
            brand: product.vendor
              ? { "@type": "Brand", name: product.vendor }
              : undefined,
          }),
        }}
      />
    </div>
  );
}
