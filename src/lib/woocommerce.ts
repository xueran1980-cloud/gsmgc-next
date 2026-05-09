// WooCommerce REST API — 订单创建 + 库存校验 + 订单查询
// ★ v6.2: 统一走 fetchWithFallbackClient（直连→proxy 自动 fallback）
//   清除废弃代码：WC_PROXY, createOrderWC, getBasicAuthHeader (2026-05-09)

import { fetchWithFallbackClient } from '@/lib/fetchWithFallback';
import { parseApiResponse, fetchAndParse, type FetchResult } from '@/lib/apiParser';
import { getAuthToken } from '@/api/auth';

interface CreateOrderResponse {
  id: number;
  order_id?: number;
  order_key: string;
  status: string;
  total: string;
  line_items?: Array<{ product_id: number; quantity: number; total: string }>;
  customer_id?: number;
  degraded?: boolean;
  message?: string;
}

// ★ createOrder 统一走 fetchWithFallbackClient（直连→proxy 自动 fallback）
export async function createOrder(orderData: Record<string, unknown>): Promise<CreateOrderResponse> {
  const token = getAuthToken() ?? undefined;
  const result: FetchResult<CreateOrderResponse> = await fetchAndParse<CreateOrderResponse>(
    fetchWithFallbackClient('/wp-json/gsmgc/v1/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    }, token)
  );

  if (!result.ok || !result.data) {
    // 业务错误（如库存不足）— WP 可能返回 200 + { success: false }
    const msg = (result.data as any)?.message || `Error (${result.status})`;
    throw new Error(msg);
  }

  return result.data;
}

// 获取客户订单列表（走 Next.js API Route，透传后端响应）
export async function getCustomerOrders(): Promise<any> {
  const token = getAuthToken();
  if (!token) return { orders: [] };

  const res = await fetch('/api/orders', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const result = await parseApiResponse<any>(res);

  if (!result.ok) {
    // 401 = token 无效，返回空不抛异常
    if (result.reason === 'unauthorized') return { orders: [] };
    throw new Error('Error al obtener pedidos');
  }

  return result.data;
}

// 获取单个订单详情（走 fetchWithFallbackClient）
export async function getOrder(orderId: number | string): Promise<any> {
  const result = await fetchAndParse<any>(
    fetchWithFallbackClient(`/wp-json/gsmgc/v1/orders/${orderId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, getAuthToken() ?? undefined)
  );

  if (!result.ok) {
    throw new Error('Error al obtener el pedido');
  }

  return result.data;
}

// 删除订单内单个产品（走 fetchWithFallbackClient）
export async function removeOrderItem(orderId: number | string, itemId: number | string): Promise<any> {
  const result = await fetchAndParse<any>(
    fetchWithFallbackClient(`/wp-json/gsmgc/v1/orders/${orderId}/remove-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    }, getAuthToken() || undefined)
  );

  if (!result.ok) {
    const errMsg = (result.data as any)?.message || `Error (${result.status})`;
    throw new Error(errMsg);
  }

  return result.data;
}

export interface StockCheckItem {
  product_id: number;
  quantity: number;
}

export interface StockCheckResult {
  ok: boolean;
  insufficient?: Array<{
    product_id: number;
    name: string;
    sku: string;
    requested: number;
    stock_quantity: number;
    status: string;
  }>;
}

// 结账前库存实时校验（走 fetchWithFallbackClient）
export async function stockCheck(items: Array<{ id: number; qty: number }>): Promise<StockCheckResult> {
  const result = await fetchAndParse<any>(
    fetchWithFallbackClient('/wp-json/gsmgc/v1/stock-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(item => ({ product_id: item.id, quantity: item.qty })) }),
    }, getAuthToken() ?? undefined)
  );

  if (!result.ok) {
    const errMsg = (result.data as any)?.message || `Error de verificación de stock (${result.status})`;
    throw new Error(errMsg);
  }

  return result.data;
}
