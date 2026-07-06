import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import ShareButton from "@/components/ShareButton";
import { getDisplayPrice } from "@/lib/display-formatter";
import { resolveImageUrl } from "@/lib/image";
import { PriceOrLoginPrompt } from "@/components/PriceOrLoginPrompt";
import ProductDetailActions from "./ProductDetailActions";

export const revalidate = 600;
export const dynamicParams = true;

// ★ ISR 生效关键: generateStaticParams 声明本路由为静态预渲染
export async function generateStaticParams() {
  return [] as { id: string; slug: string }[];
}

// ── 数据（P1: O(1) product-by-id，fallback products-raw）──

const API = 'https://api.gsmgc.es';

async function getProduct(id: string) {
  const TIMEOUT_MS = 8000;
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(
        `${API}/wp-json/gsmgc/v1/product-by-id?id=${id}`,
        { next: { revalidate: 600 }, signal: AbortSignal.timeout(TIMEOUT_MS) }
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) return json.data;
      }
      // 400/404: 确定不存在，不重试
      if (res.status === 400 || res.status === 404) {
        return null;
      }
      console.warn(`[getProduct] product-by-id id=${id} attempt=${attempt + 1} status=${res.status}`);
    } catch (err) {
      console.error(`[getProduct] product-by-id id=${id} attempt=${attempt + 1} error=${(err as Error).message}`);
    }
    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
    }
  }

  // ★ 全部重试失败 → fallback products-raw（2 次重试，2s→4s 退避）
  console.warn(`[getProduct] product-by-id failed after ${MAX_RETRIES} retries, falling back to products-raw id=${id}`);
  const FB_RETRIES = 2;
  const FB_DELAYS = [2000, 4000];
  for (let fbAttempt = 0; fbAttempt < FB_RETRIES; fbAttempt++) {
    try {
      const res = await fetch(
        `${API}/wp-json/gsmgc/v1/products-raw`,
        { next: { revalidate: 600 }, signal: AbortSignal.timeout(15000) }
      );
      if (res.ok) {
        const data = await res.json();
        const products = data.products || data;
        const product = products.find((p: any) => String(p.id) === id);
        if (product) return product;
        return null; // 产品确实不存在
      }
      console.warn(`[getProduct] products-raw fallback id=${id} attempt=${fbAttempt + 1} status=${res.status}`);
    } catch (err) {
      console.error(`[getProduct] products-raw fallback id=${id} attempt=${fbAttempt + 1} error=${(err as Error).message}`);
    }
    if (fbAttempt < FB_RETRIES - 1) {
      await new Promise(r => setTimeout(r, FB_DELAYS[fbAttempt]));
    }
  }
  return null;
}

// ── SEO（P1: O(1) product-by-id，复用页面 fetch cache）──

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params;
  const product = await getProduct(id);
  const title = product?.name
    || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const desc = product
    ? (product.short_description || product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || '')
    : `Producto ${id} — detalles y disponibilidad en GSMGC`;
  return {
    title,
    description: desc,
    alternates: { canonical: `https://gsmgc.es/producto/${id}/${slug}` },
    robots: { index: true, follow: true },
  };
}

// ── API 失败降级 UI（不进 404 链，ISR 600s 后自动恢复）──

function ProductUnavailable({ id }: { id: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Producto no disponible temporalmente
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        No se ha podido cargar la información de este producto.
        Por favor, inténtalo de nuevo en unos instantes.
      </p>
      <div className="flex gap-3 justify-center">
        <a href="/tienda"
          className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1d4ed8] transition">
          Volver a la tienda
        </a>
        <a href="/"
          className="border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:border-[#2563eb] transition">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

// ── 页面 ──

export default async function ProductDetailPage({ params }: Props) {
  const { id, slug } = await params;
  const product = await getProduct(id);

  // API 失败（重试+fallback 全部失败）→ 不进 404 链
  if (!product) {
    return <ProductUnavailable id={id} />;
  }

  // 真 404: slug 不匹配
  if (product.slug !== slug) return notFound();

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
