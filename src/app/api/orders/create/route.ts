/**
 * POST /api/orders/create
 * Proxy to WooCommerce create-order endpoint (BYPASS CF Bot Fight Mode)
 *
 * ★ ORDER-SAFETY v1.0 + RUNTIME OBSERVABILITY v1.0:
 *   1. 服务端幂等缓存 — 同一 idempotency_key 只转一次 WC
 *   2. 订单创建日志 — 记录请求/响应/耗时
 *   3. 数据一致性 — 透传 WC 完整 response 给前端校验
 *   4. 指标收集 — 成功率/p95延迟/幂等命中率/错误分类
 *   5. 自动告警 — 连续失败/低成功率/高延迟
 */
import { NextRequest, NextResponse } from 'next/server';
import { recordMetric, classifyError, type ErrorCategory } from '@/lib/order-metrics';

// ★ 内存幂等缓存 — 5分钟内同一 key 返回缓存结果
const IDEMPOTENCY_CACHE = new Map<string, { status: number; data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  let idempotencyHit = false;
  let success = false;
  let errorCategory: ErrorCategory | undefined;
  let orderId: number | undefined;
  let wcStatus: number | undefined;

  try {
    const body = await request.json();

    // ★ 服务端幂等检查
    const idempotencyKey = body.idempotency_key as string | undefined;
    if (idempotencyKey) {
      cleanExpiredCache();
      const cached = IDEMPOTENCY_CACHE.get(idempotencyKey);
      if (cached) {
        idempotencyHit = true;
        success = cached.status >= 200 && cached.status < 300;
        orderId = (cached.data as any)?.id || (cached.data as any)?.order_id;

        // ★ RUNTIME OBSERVABILITY: 记录幂等命中指标
        recordMetric({
          timestamp: Date.now(),
          latencyMs: Date.now() - startTime,
          success,
          idempotencyHit: true,
          orderId,
          idempotencyKey,
        });

        console.log(`[ORDER-SAFETY] 🔄 Idempotency hit: ${idempotencyKey} → cached result`);
        return NextResponse.json(cached.data, {
          status: cached.status,
          headers: { 'Cache-Control': 'no-store', 'X-Idempotency-Hit': '1' },
        });
      }
    }

    // ★ 请求日志
    console.log(`[OBSERVABILITY] 📦 Order request:`, JSON.stringify({
      key: idempotencyKey || 'none',
      items: body.line_items?.length || 0,
      payment: body.payment_method || '?',
      email: body.billing?.email || '?',
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };

    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    // 直连 WC
    const res = await fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - startTime;
    wcStatus = res.status;
    const ct = (res.headers.get('Content-Type') || '').toLowerCase();

    // CF blocked / HTML response
    if (ct.includes('text/html')) {
      errorCategory = 'NETWORK_ERROR';
      const errorData = { success: false, message: 'Servidor temporalmente no disponible (CF)', code: 'CF_BLOCKED', errorCategory };

      recordMetric({ timestamp: Date.now(), latencyMs: elapsed, success: false, idempotencyHit: false, errorCategory, idempotencyKey });

      console.error(`[OBSERVABILITY] ❌ CF_BLOCKED (${elapsed}ms) key=${idempotencyKey || 'none'}`);
      return NextResponse.json(errorData, { status: 502 });
    }

    const data = await res.json();
    success = res.ok;
    orderId = data?.id || data?.order_id;

    if (!success) {
      errorCategory = classifyError(data?.message || data, wcStatus);
    }

    // ★ 记录指标
    recordMetric({
      timestamp: Date.now(),
      latencyMs: elapsed,
      success,
      idempotencyHit: false,
      errorCategory,
      userId: body.billing?.email,
      idempotencyKey,
      orderId,
    });

    if (success) {
      console.log(`[OBSERVABILITY] ✅ Order #${orderId} created (${elapsed}ms)`);
    } else {
      console.error(`[OBSERVABILITY] ❌ Order failed [${errorCategory}] (${elapsed}ms): ${data?.message || wcStatus}`);
    }

    // 缓存成功结果
    if (idempotencyKey && success) {
      IDEMPOTENCY_CACHE.set(idempotencyKey, { status: res.status, data, timestamp: Date.now() });
    }

    return NextResponse.json(
      { ...data, errorCategory }, // ★ 透传错误分类给前端
      { status: res.status, headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    errorCategory = classifyError(err);

    recordMetric({
      timestamp: Date.now(),
      latencyMs: elapsed,
      success: false,
      idempotencyHit,
      errorCategory,
      idempotencyKey: undefined as any,
    });

    console.error(`[OBSERVABILITY] ❌ Proxy error [${errorCategory}] (${elapsed}ms): ${err.message}`);

    return NextResponse.json(
      { success: false, message: 'Order proxy error', error: err.message, code: 'PROXY_ERROR', errorCategory },
      { status: 500 }
    );
  }
}
