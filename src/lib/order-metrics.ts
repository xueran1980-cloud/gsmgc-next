/**
 * Order Metrics — 运行时可观测性核心
 *
 * 功能：
 *   1. 每请求指标记录（延迟、成功/失败、幂等命中）
 *   2. 滑动窗口聚合（p95延迟、成功率、错误率）
 *   3. 错误分级（NETWORK_ERROR / WC_ERROR / VALIDATION_ERROR / UNKNOWN_ERROR）
 *   4. 自动告警（连续失败、成功率 < 90%、p95 > 5s）
 *
 * 数据：纯内存存储，Vercel serverless 实例内共享
 */
export type ErrorCategory = 'NETWORK_ERROR' | 'WC_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT_ERROR' | 'AUTH_ERROR' | 'UNKNOWN_ERROR';

export interface OrderMetric {
  timestamp: number;
  latencyMs: number;
  success: boolean;
  idempotencyHit: boolean;
  errorCategory?: ErrorCategory;
  userId?: string | number;
  idempotencyKey?: string;
  orderId?: number;
}

export interface AggregatedMetrics {
  windowSize: number;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  idempotencyHits: number;
  idempotencyHitRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorsByCategory: Record<string, number>;
  alerts: Alert[];
}

export interface Alert {
  level: 'CRITICAL' | 'WARNING';
  rule: string;
  message: string;
  timestamp: number;
}

// ── 内存存储 ─────────────────────────────────────────
const WINDOW_SIZE = 100; // 最近 100 条记录
const metrics: OrderMetric[] = [];
const alerts: Alert[] = [];

// ── 记录指标 ─────────────────────────────────────────

export function recordMetric(metric: OrderMetric): void {
  metrics.push(metric);
  // 保持窗口大小
  while (metrics.length > WINDOW_SIZE) metrics.shift();
  // 触发告警检查
  checkAlerts();
}

// ── 错误分类 ─────────────────────────────────────────

export function classifyError(error: unknown, wcStatus?: number): ErrorCategory {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('timeout') || msg.includes('enotfound')) {
    return wcStatus === 408 || msg.includes('timeout') ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR';
  }
  if (msg.includes('cf_blocked') || msg.includes('html') || msg.includes('sgcaptcha')) {
    return 'NETWORK_ERROR';
  }
  if (wcStatus && wcStatus >= 400 && wcStatus < 500) {
    if (wcStatus === 401 || wcStatus === 403) return 'AUTH_ERROR';
    if (wcStatus === 409) return 'VALIDATION_ERROR';
    return 'VALIDATION_ERROR';
  }
  if (wcStatus && wcStatus >= 500) {
    return 'WC_ERROR';
  }
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('missing') || msg.includes('required')) {
    return 'VALIDATION_ERROR';
  }
  if (msg.includes('woocommerce') || msg.includes('wp_error')) {
    return 'WC_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

// ── 聚合计算 ─────────────────────────────────────────

export function getAggregatedMetrics(): AggregatedMetrics {
  const total = metrics.length;
  const success = metrics.filter(m => m.success).length;
  const failed = total - success;
  const idempotencyHits = metrics.filter(m => m.idempotencyHit).length;

  // 排序延迟
  const sorted = [...metrics].sort((a, b) => a.latencyMs - b.latencyMs);
  const p50 = sorted[Math.floor(sorted.length * 0.5)]?.latencyMs || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]?.latencyMs || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)]?.latencyMs || 0;
  const avgLatency = total > 0 ? sorted.reduce((s, m) => s + m.latencyMs, 0) / total : 0;

  // 错误分类统计
  const errorsByCategory: Record<string, number> = {};
  for (const m of metrics) {
    if (!m.success && m.errorCategory) {
      errorsByCategory[m.errorCategory] = (errorsByCategory[m.errorCategory] || 0) + 1;
    }
  }

  return {
    windowSize: WINDOW_SIZE,
    total,
    success,
    failed,
    successRate: total > 0 ? (success / total * 100) : 100,
    idempotencyHits,
    idempotencyHitRate: total > 0 ? (idempotencyHits / total * 100) : 0,
    avgLatencyMs: Math.round(avgLatency),
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    errorsByCategory,
    alerts: [...alerts].slice(-10), // 最近10条告警
  };
}

// ── 告警检查 ─────────────────────────────────────────

function checkAlerts(): void {
  const recent = metrics.slice(-10); // 最近 10 条

  // 告警1: 连续 3 次失败
  const last3 = metrics.slice(-3);
  if (last3.length === 3 && last3.every(m => !m.success)) {
    const alert: Alert = {
      level: 'CRITICAL',
      rule: 'CONSECUTIVE_FAILURES',
      message: `连续 ${last3.length} 次下单失败！最近错误: ${last3.map(m => m.errorCategory || 'unknown').join(', ')}`,
      timestamp: Date.now(),
    };
    if (!alerts.some(a => a.rule === 'CONSECUTIVE_FAILURES' && Date.now() - a.timestamp < 60000)) {
      alerts.push(alert);
      if (typeof console !== 'undefined') {
        console.error('[OBSERVABILITY] 🚨 CRITICAL: CONSECUTIVE_FAILURES — 连续下单失败!');
        console.error(JSON.stringify({
          alert,
          recentFailures: last3.map(m => ({ error: m.errorCategory, userId: m.userId, ts: new Date(m.timestamp).toISOString() })),
        }));
      }
    }
  }

  // 告警2: 成功率 < 90%（至少 10 条数据）
  if (recent.length >= 10) {
    const successCount = recent.filter(m => m.success).length;
    const rate = (successCount / recent.length) * 100;
    if (rate < 90) {
      const alert: Alert = {
        level: 'CRITICAL',
        rule: 'LOW_SUCCESS_RATE',
        message: `下单成功率 ${rate.toFixed(1)}% < 90% (${successCount}/${recent.length})`,
        timestamp: Date.now(),
      };
      if (!alerts.some(a => a.rule === 'LOW_SUCCESS_RATE' && Date.now() - a.timestamp < 60000)) {
        alerts.push(alert);
        if (typeof console !== 'undefined') {
          console.error('[OBSERVABILITY] 🚨 CRITICAL: LOW_SUCCESS_RATE — 成功率 < 90%!');
          console.error(JSON.stringify({ alert, metrics: getAggregatedMetrics() }));
        }
      }
    }
  }

  // 告警3: p95 延迟 > 5s
  const sorted = [...metrics].sort((a, b) => a.latencyMs - b.latencyMs);
  const p95 = sorted[Math.floor(sorted.length * 0.95)]?.latencyMs || 0;
  if (p95 > 5000 && metrics.length >= 5) {
    const alert: Alert = {
      level: 'WARNING',
      rule: 'HIGH_LATENCY',
      message: `p95 延迟 ${p95}ms > 5000ms，WC 可能响应缓慢`,
      timestamp: Date.now(),
    };
    if (!alerts.some(a => a.rule === 'HIGH_LATENCY' && Date.now() - a.timestamp < 120000)) {
      alerts.push(alert);
      if (typeof console !== 'undefined') {
        console.warn('[OBSERVABILITY] ⚠️ WARNING: HIGH_LATENCY — p95 > 5s!');
        console.warn(JSON.stringify({ p95LatencyMs: p95, totalRecords: metrics.length }));
      }
    }
  }

  // 清理旧告警（保留 50 条）
  while (alerts.length > 50) alerts.shift();
}

// ── 重置（用于测试/调试） ─────────────────────────────

export function resetMetrics(): void {
  metrics.length = 0;
  alerts.length = 0;
}
