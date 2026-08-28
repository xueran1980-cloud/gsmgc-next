import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import type { Product } from '@/lib/api';
import TiendaClient from '@/components/TiendaClient';

// ★ DoD B（2026-08-27）：读 cookies() → 本路由 dynamic（Vercel 层 ISR 移除，游客由 CF「Cache HTML 5min」override_origin 承接）
// 所有筛选/搜索/翻页由 TiendaClient 客户端处理

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

// ★ 不使用 searchParams prop（否则 Next.js 忽略 ISR，强制 no-store）
// ★ 始终渲染默认视图，客户端 TiendaClient 读取 URL 参数后自行 fetch
// ★ DoD B（2026-08-27）：读 cookies() 使本路由 dynamic（Vercel 层 ISR 移除，游客由 CF「Cache HTML 5min」override_origin 承接）；
//   登录客户（带 gsmgc_auth httpOnly cookie）→ 服务端并行取 products + products-prices → 首帧 HTML 直接带本客户价格
export default async function TiendaPage() {
  const cookieStore = await cookies();
  // ★ set-cookie 时 encodeURIComponent（login route）→ 读取后必须 decode，否则 Bearer 是编码值 → WP 401 → 无价降级
  const rawToken = cookieStore.get('gsmgc_auth')?.value || null;
  let authToken: string | null = null;
  if (rawToken) {
    try { authToken = decodeURIComponent(rawToken); } catch { authToken = rawToken; }
  }
  let initialProducts: Product[] = [];
  let initialTotal = 0;
  let fetched = false; // 是否成功获取（含合法空），失败语义用

  // fetch — 默认排序 + 1次重试（应对 CF Bot Fight Mode）；dynamic 后无 ISR，重试语义保留
  const backendUrl = 'https://api.gsmgc.es/wp-json/gsmgc/v1/products-paginated?per_page=24&page=1&orderby=price&order=desc';
  const fetchOpts = { headers: { 'User-Agent': 'GSMGC-Next-Server/1.0', 'Accept': 'application/json' }, cache: 'no-store' as const };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(backendUrl, fetchOpts);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.products) && json.products.length > 0) {
          initialProducts = json.products;
          initialTotal = json.total || 0;
          fetched = true;
          break;
        }
        if (json.success && Array.isArray(json.products)) {
          initialProducts = [];
          initialTotal = 0;
          fetched = true;
          break;
        }
      }
      if (attempt === 0) {
        console.warn('[tienda SSR] fetch failed, retrying...');
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      if (attempt === 0) {
        console.warn('[tienda SSR] fetch exception, retrying:', (err as Error).message);
        await new Promise(r => setTimeout(r, 200));
      } else {
        console.error('[tienda SSR] fetch failed after retry:', (err as Error).message);
      }
    }
  }

  // ★ 失败语义：两次尝试均未成功获取 → throw（dynamic 下渲染 error.tsx；保留现状 throw 语义）
  if (!fetched) {
    console.error('[tienda SSR] both attempts failed, throwing');
    throw new Error('Tienda: fallo al cargar el catálogo');
  }

  // ★ DoD B：登录客户 → 服务端取本客户价格（串行依赖 ids；失败降级 → 客户端 ensurePrices 兜底，零功能损失）
  if (authToken && initialProducts.length > 0) {
    const ids = initialProducts.map((p) => p.id).join(',');
    try {
      const res = await fetch(
        `https://api.gsmgc.es/wp-json/gsmgc/v1/products-prices?ids=${ids}`,
        {
          headers: { 'User-Agent': 'GSMGC-Next-Server/1.0', 'Accept': 'application/json', Authorization: `Bearer ${authToken}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.prices) {
          initialProducts = initialProducts.map((p) => ({
            ...p,
            _price: json.prices[String(p.id)] as Product['_price'],
          }));
        }
      }
    } catch (err) {
      console.warn('[tienda SSR] prices fetch failed, client ensurePrices fallback:', (err as Error).message);
    }
  }

  return (
    <Suspense fallback={<TiendaSkeleton />}>
    <TiendaClient
      initialProducts={initialProducts}
      initialTotal={initialTotal}
      initialPage={1}
    />
    </Suspense>
  );
}

// ★ RSC Suspense fallback — C' (2026-08-28): 轻量占位（单 spinner）替代 24 卡整页骨架。
//   只改视觉 fallback：RSC/SSR 数据逻辑、TiendaClient 生命周期、价格同步均不变。
//   整页导航（RSC 慢/失败 fallback）时用户看到轻量加载态，而非吓人的整页骨架。
function TiendaSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-40">
          <div className="flex items-center gap-2.5 text-gray-400">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Cargando…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
