import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import { getDisplayPrice } from "@/lib/display-formatter";
import { resolveImageUrl } from "@/lib/image";

// ── 数据 ──

async function getProduct(id: string) {
  try {
    const res = await fetch(
      `https://api.gsmgc.es/wp-json/wc/store/v1/products/${id}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return await res.json();
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

  return {
    title: product.name,
    description: typeof desc === "string" ? desc.slice(0, 160) : "",
    openGraph: {
      title: product.name,
      description: typeof desc === "string" ? desc.slice(0, 160) : "",
      images: product.images?.length > 0
        ? [{ url: resolveImageUrl(product.images[0].src) }]
        : [],
    },
  };
}

// ── 页面 ──

export default async function ProductDetailPage({ params }: Props) {
  const { id, slug } = await params;
  const product = await getProduct(id);

  if (!product || product.slug !== slug) notFound();

  const dp = getDisplayPrice(
    String(product.prices?.price ?? product.price ?? "0"),
    String(product.prices?.regular_price ?? product.regular_price ?? "")
  );

  const inStock = product.stock_status === "instock" ||
    product.is_in_stock === true;

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

          {/* Price */}
          <div className="mb-6">
            {dp.showBadge ? (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-black text-[#2563eb]">
                  {dp.igic}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  {dp.regular}
                </span>
                <span className="bg-[#ea580c] text-white text-sm font-bold px-2 py-0.5 rounded-lg">
                  -{dp.discountPct}%
                </span>
              </div>
            ) : (
              <span className="text-3xl font-black text-gray-900">
                {dp.igic}
              </span>
            )}
            <span className="block text-xs text-gray-400 mt-1">IGIC incluido</span>
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
    </div>
  );
}
