/**
 * GET /api/orders/metrics
 * Runtime observability — 订单指标面板
 */
import { NextResponse } from 'next/server';
import { getAggregatedMetrics } from '@/lib/order-metrics';

export async function GET() {
  try {
    const metrics = getAggregatedMetrics();

    // 健康状态评估
    const health = metrics.successRate >= 90 && metrics.p95LatencyMs < 5000
      ? 'healthy'
      : metrics.successRate >= 70
        ? 'degraded'
        : 'critical';

    return NextResponse.json({
      ok: true,
      health,
      metrics,
      timestamp: new Date().toISOString(),
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
