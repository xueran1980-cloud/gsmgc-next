/**
 * Order State Machine — 状态一致性收敛层
 *
 * 三态模型:
 *   SUCCESS    — 已确认成功 (终极态)
 *   FAILED     — 最终失败 (终极态)
 *   PROCESSING — 仅短暂状态, 不持久 (过渡态)
 *
 * 收敛规则 (优先级):
 *   SUCCESS > PROCESSING > FAILED
 *   无论经历了多少次 retry / degraded, 最终只有 1 个状态
 *
 * 用户可见:
 *   success / failed / processing
 *   禁止暴露: retryCount, recoveryApplied, intermediateState (内部日志用)
 */
export type FinalOrderState = 'SUCCESS' | 'FAILED' | 'PROCESSING';

export interface OrderStateResult {
  /** 最终收敛状态 — single source of truth */
  status: 'success' | 'failed' | 'processing';
  /** 用户可读消息 */
  display: string;
  /** 内部追踪字段 (仅日志, 不暴露给用户) */
  _internal: {
    finalState: FinalOrderState;
    wcConfirmed: boolean;
    retryCount: number;
    recoveryApplied: boolean;
    degradedAt: string | null;
    intermediateStates: string[];
    resolvedAt: string;
  };
}

// ── 内存状态存储 (Vercel instance scope) ─────────────────
// key = idempotencyKey → OrderStateResult
const STATE_REGISTRY = new Map<string, OrderStateResult>();

// ── 收敛函数 ─────────────────────────────────────────────

/**
 * 合并多个中间状态 → 1 个最终状态
 * 优先级: SUCCESS > PROCESSING > FAILED
 */
function converge(finalState: FinalOrderState, ...intermediateStates: FinalOrderState[]): FinalOrderState {
  const all = [finalState, ...intermediateStates];
  if (all.includes('SUCCESS')) return 'SUCCESS';
  if (all.includes('PROCESSING')) return 'PROCESSING';
  return 'FAILED';
}

// ── 状态注册 ─────────────────────────────────────────────

/**
 * 注册或更新订单最终状态
 * 幂等: 同一 key 第二次调用 → 使用 converge() 合并
 */
export function registerOrderState(
  idempotencyKey: string,
  state: {
    finalState: FinalOrderState;
    wcConfirmed?: boolean;
    retryCount?: number;
    recoveryApplied?: boolean;
    degraded?: boolean;
    intermediateState?: string;
    display?: string;
  }
): OrderStateResult {
  const existing = STATE_REGISTRY.get(idempotencyKey);

  // 构建中间状态列表
  const intermediateStates: string[] = existing?._internal.intermediateStates || [];
  if (state.intermediateState) intermediateStates.push(state.intermediateState);

  // 收敛
  const prevFinalState = existing?._internal.finalState;
  const newFinalState = prevFinalState
    ? converge(state.finalState, prevFinalState)
    : state.finalState;

  // 用户可读消息
  const displayMessages: Record<string, string> = {
    SUCCESS: 'Pedido confirmado y en preparación.',
    FAILED: 'El pedido no se ha podido procesar. Inténtalo de nuevo.',
    PROCESSING: 'Pedido recibido, pendiente de confirmación. Te notificaremos por email.',
  };

  const result: OrderStateResult = {
    status: newFinalState.toLowerCase() as 'success' | 'failed' | 'processing',
    display: state.display || displayMessages[newFinalState] || '',
    _internal: {
      finalState: newFinalState,
      wcConfirmed: existing?._internal.wcConfirmed || state.wcConfirmed || (newFinalState === 'SUCCESS'),
      retryCount: Math.max(existing?._internal.retryCount || 0, state.retryCount || 0),
      recoveryApplied: existing?._internal.recoveryApplied || state.recoveryApplied || false,
      degradedAt: state.degraded ? new Date().toISOString()
        : existing?._internal.degradedAt || null,
      intermediateStates,
      resolvedAt: new Date().toISOString(),
    },
  };

  STATE_REGISTRY.set(idempotencyKey, result);
  return result;
}

// ── 状态查询 ─────────────────────────────────────────────

/**
 * Single source of truth — 前端必须只消费此函数
 */
export function getOrderStatus(idempotencyKey: string): OrderStateResult | null {
  return STATE_REGISTRY.get(idempotencyKey) || null;
}

// ── 工厂函数 (便捷) ──────────────────────────────────────

export function stateSuccess(idempotencyKey: string, orderId?: number): OrderStateResult {
  return registerOrderState(idempotencyKey, {
    finalState: 'SUCCESS',
    wcConfirmed: true,
    display: `Pedido #${orderId || ''} confirmado y en preparación.`,
    intermediateState: `WC_SUCCESS(orderId=${orderId})`,
  });
}

export function stateFailed(
  idempotencyKey: string,
  reason: string,
  retryCount: number = 0,
  recoveryApplied: boolean = false
): OrderStateResult {
  return registerOrderState(idempotencyKey, {
    finalState: 'FAILED',
    wcConfirmed: false,
    retryCount,
    recoveryApplied,
    intermediateState: `FAILED(reason=${reason}, retries=${retryCount})`,
  });
}

export function stateProcessing(
  idempotencyKey: string,
  reason: string,
  retryCount: number = 0
): OrderStateResult {
  registerOrderState(idempotencyKey, {
    finalState: 'PROCESSING',
    wcConfirmed: false,
    retryCount,
    degraded: true,
    intermediateState: `PROCESSING(reason=${reason}, retries=${retryCount})`,
  });
  return getOrderStatus(idempotencyKey)!;
}

// ── 收敛验证 ─────────────────────────────────────────────

/**
 * 检查是否存在状态冲突 (用于调试)
 * 返回: 如果有冲突 → 所有冲突记录; 否则 null
 */
export function checkStateConflict(idempotencyKey: string): {
  final: FinalOrderState;
  intermediates: string[];
  converged: FinalOrderState;
} | null {
  const result = STATE_REGISTRY.get(idempotencyKey);
  if (!result || result._internal.intermediateStates.length <= 1) return null;

  const intermediates = result._internal.intermediateStates;
  const unique = [...new Set(intermediates.map(s => s.split('(')[0] as FinalOrderState))];

  if (unique.length <= 1) return null; // 无冲突

  return {
    final: result._internal.finalState,
    intermediates: result._internal.intermediateStates,
    converged: converge(result._internal.finalState, ...unique),
  };
}
