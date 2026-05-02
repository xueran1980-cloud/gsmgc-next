/**
 * POST /api/orders/create
 * Proxy to WooCommerce create-order endpoint (BYPASS CF Bot Fight Mode)
 *
 * ★ ORDER-SAFETY v1.0:
 *   1. 服务端幂等缓存 — 同一 idempotency_key 只转一次 WC
 *   2. 订单创建日志 — 记录请求/响应/耗时
 *   3. 数据一致性 — 透传 WC 完整 response 给前端校验
 */
import { NextRequest, NextResponse } from 'next/server';

// ★ ORDER-SAFETY: 内存幂等缓存 — 5分钟内同一 key 返回缓存结果
//   Map<idempotencyKey, { status, data, timestamp }>
const IDEMPOTENCY_CACHE = new Map<string, { status: number; data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of IDEMPOTENCY_CACHE.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      IDEMPOTENCY_CACHE.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // ★ ORDER-SAFETY: 服务端幂等检查
    const idempotencyKey = body.idempotency_key as string | undefined;
    if (idempotencyKey) {
      cleanExpiredCache();
      const cached = IDEMPOTENCY_CACHE.get(idempotencyKey);
      if (cached) {
        console.log(`[ORDER-SAFETY] 🔄 Idempotency hit: ${idempotencyKey} → returning cached result (${Date.now() - cached.timestamp}ms old)`);
        return NextResponse.json(cached.data, {
          status: cached.status,
          headers: { 'Cache-Control': 'no-store', 'X-Idempotency-Hit': '1' },
        });
      }
      console.log(`[ORDER-SAFETY] 🆕 New idempotency key: ${idempotencyKey}, proceeding to WC`);
    }

    // ★ ORDER-SAFETY: 请求日志
    const reqLog = {
      idempotencyKey: idempotencyKey || 'not_provided',
      lineItems: body.line_items?.length || 0,
      paymentMethod: body.payment_method || 'unknown',
      billingEmail: body.billing?.email || 'unknown',
      timestamp: new Date().toISOString(),
    };
    console.log(`[ORDER-SAFETY] 📦 API received:`, JSON.stringify(reqLog));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };

    // ★ 透传 Authorization token
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    // ★ 透传 Cookie
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    // Server-side: direct fetch to api.gsmgc.es (bypass Vercel edge proxy for POST)
    const res = await fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const ct = (res.headers.get('Content-Type') || '').toLowerCase();
    const elapsed = Date.now() - startTime;

    // CF blocked → HTML → 502
    if (ct.includes('text/html')) {
      console.error(`[ORDER-SAFETY] ❌ CF blocked (${elapsed}ms): HTML response from WC`);
      return NextResponse.json(
        { success: false, message: 'Servidor temporalmente no disponible (CF)', code: 'CF_BLOCKED' },
        { status: 502 }
      );
    }

    const data = await res.json();

    // ★ ORDER-SAFETY: 响应日志
    const respLog = {
      wcStatus: res.status,
      wcOk: res.ok,
      orderId: data?.id || data?.order_id || 'N/A',
      wcTotal: data?.total || 'N/A',
      lineItems: data?.line_items?.length || 'N/A',
      elapsed: `${elapsed}ms`,
      idempotencyKey: idempotencyKey || 'not_provided',
    };

    if (res.ok) {
      console.log(`[ORDER-SAFETY] ✅ WC success:`, JSON.stringify(respLog));
    } else {
      console.error(`[ORDER-SAFETY] ❌ WC error:`, JSON.stringify({ ...respLog, wcError: data?.message || 'unknown' }));
    }

    // ★ ORDER-SAFETY: 缓存成功结果（幂等防重复）
    if (idempotencyKey && res.ok) {
      IDEMPOTENCY_CACHE.set(idempotencyKey, {
        status: res.status,
        data,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[ORDER-SAFETY] ❌ Proxy error (${elapsed}ms):`, err.message);
    return NextResponse.json(
      { success: false, message: 'Order proxy error', error: err.message, code: 'PROXY_ERROR' },
      { status: 500 }
    );
  }
}
