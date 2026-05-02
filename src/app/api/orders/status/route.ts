/**
 * GET /api/orders/status?key=<idempotencyKey>
 *
 * ★ STATE CONSISTENCY FINALIZER — Single source of truth
 *
 * 前端必须只消费此端点获取订单最终状态
 * 禁止直接使用 retry/degraded 等中间状态
 *
 * 返回:
 *   { status: "success" | "failed" | "processing", display: string }
 *
 * 内部字段 _internal 仅用于日志/调试，不渲染给用户
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus } from '@/lib/order-state';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { status: 'failed', display: 'Falta el identificador del pedido (key).' },
        { status: 400 }
      );
    }

    const state = getOrderStatus(key);

    if (!state) {
      return NextResponse.json(
        { status: 'processing', display: 'Pedido en proceso. Consulta de nuevo en unos segundos.' },
        { status: 200 }
      );
    }

    // ★ 只暴露 status + display 给前端
    //    _internal 保留在 response 中供调试 (console.log) 但不渲染到 UI
    return NextResponse.json(
      {
        status: state.status,
        display: state.display,
        _internal: state._internal,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: 'failed', display: 'Error al consultar el estado del pedido.' },
      { status: 500 }
    );
  }
}
