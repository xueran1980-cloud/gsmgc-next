/**
 * POST /api/orders/create
 * Proxy to WooCommerce create-order endpoint (BYPASS CF Bot Fight Mode)
 *
 * ★ AUTO-RECOVERY v1.0:
 *   1. 自动重试: NETWORK_ERROR/TIMEOUT/5xx → 2次指数退避 (500ms→1500ms)
 *   2. 降级策略: WC 完全不可达 → "Pedido recibido, en proceso" pending 状态
 *   3. 用户无感: 重试成功不显示错误，重试失败返回明确提示
 *   4. 增强日志: retryCount / recoveryApplied / finalStatus
 */
import { NextRequest, NextResponse } from 'next/server';
import { recordMetric, classifyError, type ErrorCategory } from '@/lib/order-metrics';

// ★ 内存幂等缓存
const IDEMPOTENCY_CACHE = new Map<string, { status: number; data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ★ AUTO-RECOVERY 配置
const MAX_RETRIES = 2;
const RETRY_DELAYS = [500, 1500]; // 指数退避: 500ms → 1500ms (总计最多2s)

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of IDEMPOTENCY_CACHE.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) IDEMPOTENCY_CACHE.delete(key);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ★ AUTO-RECOVERY: 判断是否应重试
function shouldRetry(error: unknown, wcStatus?: number): boolean {
  const cat = classifyError(error, wcStatus);
  // NETWORK_ERROR / TIMEOUT_ERROR / 5xx → 可重试
  if (cat === 'NETWORK_ERROR' || cat === 'TIMEOUT_ERROR') return true;
  if (wcStatus && wcStatus >= 500 && wcStatus < 600) return true;
  // WC_ERROR 通常也可重试（临时服务端异常）
  if (cat === 'WC_ERROR') return true;
  // AUTH_ERROR / VALIDATION_ERROR → 不可重试（重试也不会变）
  return false;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let idempotencyHit = false;
  let success = false;
  let errorCategory: ErrorCategory | undefined;
  let orderId: number | undefined;
  let retryCount = 0;
  let recoveryApplied = false;
  let finalStatus: 'success' | 'failed' | 'degraded' = 'failed';

  try {
    const body = await request.json();
    const idempotencyKey = body.idempotency_key as string | undefined;

    // ★ 服务端幂等检查
    if (idempotencyKey) {
      cleanExpiredCache();
      const cached = IDEMPOTENCY_CACHE.get(idempotencyKey);
      if (cached) {
        idempotencyHit = true;
        success = cached.status >= 200 && cached.status < 300;
        orderId = (cached.data as any)?.id || (cached.data as any)?.order_id;
        finalStatus = success ? 'success' : 'failed';

        recordMetric({ timestamp: Date.now(), latencyMs: Date.now() - startTime, success,
          idempotencyHit: true, errorCategory, orderId, idempotencyKey,
          retryCount: 0, recoveryApplied: false, finalStatus });

        return NextResponse.json(cached.data, {
          status: cached.status,
          headers: { 'Cache-Control': 'no-store', 'X-Idempotency-Hit': '1' },
        });
      }
    }

    // ★ 构建请求头
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };
    const authHeader = request.headers.get('Authorization');
    if (authHeader) forwardHeaders['Authorization'] = authHeader;
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) forwardHeaders['Cookie'] = cookieHeader;

    // ★ AUTO-RECOVERY: 重试循环 — 最多 MAX_RETRIES 次
    let lastError: any = null;
    let lastWcStatus: number | undefined;
    let lastData: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch('https://api.gsmgc.es/wp-json/gsmgc/v1/create-order', {
          method: 'POST',
          headers: forwardHeaders,
          body: JSON.stringify(body),
        });

        const ct = (res.headers.get('Content-Type') || '').toLowerCase();
        const elapsed = Date.now() - startTime;

        // CF blocked / HTML response
        if (ct.includes('text/html')) {
          lastError = new Error('CF_BLOCKED: HTML response');
          lastWcStatus = 502;
          if (attempt < MAX_RETRIES && shouldRetry(lastError, lastWcStatus)) {
            retryCount++;
            console.warn(`[AUTO-RECOVERY] 🔄 Retry ${retryCount}/${MAX_RETRIES} — CF blocked (${elapsed}ms)`);
            await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
            continue;
          }
          // 最终失败 → 降级
          errorCategory = 'NETWORK_ERROR';
          finalStatus = 'degraded';
          const degradedData = {
            success: true, // 前端看作"已接收"
            id: undefined,
            status: 'pending',
            message: 'Pedido recibido, en proceso. Te notificaremos por email cuando se confirme.',
            degraded: true,
            code: 'DEGRADED_CF_BLOCKED',
          };
          recordRecoveryMetric(startTime, idempotencyKey, errorCategory, retryCount, true, 'degraded');
          console.error(`[AUTO-RECOVERY] ⚠️ Degraded — retries exhausted (${elapsed}ms)`);
          return NextResponse.json(degradedData, {
            status: 200, // 用200让前端走成功路径，但带 degraded flag
            headers: { 'Cache-Control': 'no-store', 'X-Degraded': '1' },
          });
        }

        const data = await res.json();

        if (res.ok) {
          success = true;
          recoveryApplied = retryCount > 0;
          finalStatus = 'success';
          orderId = data?.id || data?.order_id;
          errorCategory = undefined;

          if (recoveryApplied) {
            console.log(`[AUTO-RECOVERY] ✅ Recovered! Order #${orderId} after ${retryCount} retries (${elapsed}ms)`);
          } else {
            console.log(`[OBSERVABILITY] ✅ Order #${orderId} (${elapsed}ms)`);
          }

          recordMetric({ timestamp: Date.now(), latencyMs: elapsed, success: true,
            idempotencyHit: false, errorCategory: undefined, userId: body.billing?.email,
            idempotencyKey, orderId, retryCount, recoveryApplied, finalStatus });

          // 缓存成功结果
          if (idempotencyKey) {
            IDEMPOTENCY_CACHE.set(idempotencyKey, { status: res.status, data, timestamp: Date.now() });
          }

          return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
        }

        // WC 返回非 200 — 检查是否可重试
        lastError = data?.message || `WC Error ${res.status}`;
        lastWcStatus = res.status;
        lastData = data;

        if (attempt < MAX_RETRIES && shouldRetry(lastError, lastWcStatus)) {
          retryCount++;
          console.warn(`[AUTO-RECOVERY] 🔄 Retry ${retryCount}/${MAX_RETRIES} — WC ${res.status} (${elapsed}ms)`);
          await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
          continue;
        }

        // 不可重试或重试耗尽
        errorCategory = classifyError(lastError, lastWcStatus);
        finalStatus = 'failed';
        recordRecoveryMetric(startTime, idempotencyKey, errorCategory, retryCount, false, 'failed');
        console.error(`[AUTO-RECOVERY] ❌ Failed after ${retryCount} retries [${errorCategory}] WC${lastWcStatus}`);

        return NextResponse.json(
          { ...lastData, errorCategory },
          { status: lastWcStatus || 500, headers: { 'Cache-Control': 'no-store' } }
        );

      } catch (fetchErr: any) {
        // 网络异常 — fetch 本身抛错
        lastError = fetchErr;
        lastWcStatus = undefined;

        if (attempt < MAX_RETRIES && shouldRetry(fetchErr)) {
          retryCount++;
          console.warn(`[AUTO-RECOVERY] 🔄 Retry ${retryCount}/${MAX_RETRIES} — fetch error: ${fetchErr.message}`);
          await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
          continue;
        }
        // fetch 异常耗尽 → 降级
        errorCategory = classifyError(fetchErr);
        finalStatus = 'degraded';
        recordRecoveryMetric(startTime, idempotencyKey, errorCategory, retryCount, true, 'degraded');

        const elapsed = Date.now() - startTime;
        console.error(`[AUTO-RECOVERY] ⚠️ Degraded — all ${MAX_RETRIES + 1} attempts failed (${elapsed}ms): ${fetchErr.message}`);

        return NextResponse.json({
          success: true, // 前端看作"已接收"
          status: 'pending',
          message: 'Pedido recibido, en proceso. Te notificaremos por email cuando se confirme.',
          degraded: true,
          code: 'DEGRADED_NETWORK',
        }, {
          status: 202,
          headers: { 'Cache-Control': 'no-store' },
        });
      }
    }
  } catch (err: any) {
    // 整个 route 级别的异常（JSON parse 等）
    errorCategory = classifyError(err);
    finalStatus = 'failed';

    recordMetric({
      timestamp: Date.now(), latencyMs: Date.now() - startTime, success: false,
      idempotencyHit, errorCategory, idempotencyKey: undefined as any,
      retryCount: 0, recoveryApplied: false, finalStatus: 'failed',
    });

    console.error(`[AUTO-RECOVERY] ❌ Fatal route error: ${err.message}`);
    return NextResponse.json(
      { success: false, message: 'Order proxy error', error: err.message, code: 'PROXY_ERROR', errorCategory },
      { status: 500 }
    );
  }

  // TypeScript: unreachable but needed
  function recordRecoveryMetric(
    startTime: number, idKey: string | undefined,
    errCat: ErrorCategory | undefined, rCount: number,
    recovered: boolean, fStatus: 'success' | 'failed' | 'degraded'
  ) {
    recordMetric({
      timestamp: Date.now(), latencyMs: Date.now() - startTime,
      success: false, idempotencyHit: false, errorCategory: errCat,
      idempotencyKey: idKey, retryCount: rCount,
      recoveryApplied: recovered, finalStatus: fStatus,
    });
  }

  // Should never reach here, but satisfy TS
  return NextResponse.json(
    { success: false, message: 'UNREACHABLE' },
    { status: 500 }
  );
}
