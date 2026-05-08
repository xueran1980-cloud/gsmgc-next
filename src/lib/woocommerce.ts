// WooCommerce REST API — 订单创建 + 库存校验 + 订单查询
// ★ v5.1: 客户端直连 createOrder（smartFetch 绕过 CF Bot Fight Mode）
//   SSR 兜底走 /api/orders/create（route.ts → api.gsmgc.es）

import { smartFetch, getAuthToken } from '@/api/auth';

// ★ v5.0: WC Basic Auth 也走 proxy，禁止直连
const WC_PROXY = '/api/proxy/wp-json/wc/v3';

function getBasicAuthHeader(): string {
  const user = process.env.NEXT_PUBLIC_WP_USER;
  const pass = process.env.NEXT_PUBLIC_WP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('Sistema de pedidos no configurado. Contacta con nosotros por WhatsApp.');
  }
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

interface ShippingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  postcode: string;
  country: string;
  state: string;
}

interface BillingAddress extends ShippingAddress {
  email: string;
  phone: string;
}

interface CreateOrderRequest {
  payment_method: string;
  payment_method_title: string;
  billing: BillingAddress;
  shipping: ShippingAddress;
  line_items: Array<{ product_id: number; quantity: number }>;
  status: string;
  customer_note: string;
  meta_data: Array<{ key: string; value: string }>;
  idempotency_key?: string; // ★ ORDER-SAFETY: 幂等key
}

interface CreateOrderResponse {
  id: number;
  order_id?: number;
  order_key: string;
  status: string;
  total: string;
  line_items?: Array<{ product_id: number; quantity: number; total: string }>;
  customer_id?: number;
  degraded?: boolean; // ★ AUTO-RECOVERY: 降级标记
  message?: string;
}

// ★ v5.2: 客户端双通道 — 直连优先 + Vercel 代理兜底
//   移动端 POST 大负载容易被 CF/网络中断（Load failed），代理绕过
//   SSR 始终走 /api/orders/create（route.ts → api.gsmgc.es）
export async function createOrder(orderData: Record<string, unknown>): Promise<CreateOrderResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (typeof window !== 'undefined') {
    // ★ 通道1：直连后端（最快，无中间层）
    try {
      const res = await smartFetch('/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
      });
      return handleCreateOrderResponse(res);
    } catch (directErr) {
      // ★ 通道2：直连失败 → 降级走 Vercel 代理
      //   移动端常见：Load failed (CF拦截POST) / Network error (移动网络不稳定)
      console.warn('[GSMGC] createOrder direct failed, falling back to proxy:', (directErr as Error).message);

      const token = getAuthToken();
      const proxyHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) proxyHeaders['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify(orderData),
      });
      return handleCreateOrderResponse(res);
    }
  }

  // SSR 降级：走 Vercel API Route
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/orders/create', {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData),
    credentials: 'same-origin',
  });
  return handleCreateOrderResponse(res);
}

// 统一处理 createOrder 响应（客户端直连 + SSR 兜底共用）
async function handleCreateOrderResponse(res: Response): Promise<CreateOrderResponse> {
  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  if (ct.includes('text/html')) {
    console.error('[GSMGC] create-order received HTML response');
    throw new Error('El servidor encontro un error interno. Por favor, contacta con nosotros por WhatsApp.');
  }

  if (!res.ok) {
    let errMsg: string;
    try {
      const err = await res.json();
      if (typeof err.message === 'string' && (err.message.includes('<p>') || err.message.includes('<html') || err.message.includes('wordpress.org'))) {
        errMsg = 'Error al procesar el pedido. Por favor, contacta con nosotros.';
      } else if (err.code === 'FATAL_ERROR' || err.code === 'ORDER_CREATION_FAILED') {
        errMsg = `[${err.code}] ${err.message}`;
      } else {
        errMsg = err.message || `Error (${res.status})`;
      }
    } catch {
      errMsg = `Error del servidor (${res.status})`;
    }
    throw new Error(errMsg);
  }
  return res.json();
}

// ★ v5.0: WC Basic Auth 备用下单也走 proxy（不直连 api.gsmgc.es）
export async function createOrderWC(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
  const auth = getBasicAuthHeader();

  const res = await fetch(`${WC_PROXY}/orders`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Next.js/1.0',
    },
    body: JSON.stringify(orderData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al crear el pedido (${res.status})`);
  }

  return res.json();
}

// 获取客户订单列表
export async function getCustomerOrders(): Promise<any> {
  const token = getAuthToken();
  if (!token) return { orders: [] }; // 未登录返回空
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/orders', {
    method: 'GET',
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    // 401 = token无效，返回空不抛异常
    if (res.status === 401) return { orders: [] };
    throw new Error('Error al obtener pedidos');
  }
  return res.json();
}

// 获取单个订单详情
export async function getOrder(orderId: number | string): Promise<any> {
  const res = await smartFetch(`/orders/${orderId}`);
  if (!res.ok) throw new Error('Error al obtener el pedido');
  return res.json();
}

// 删除订单内单个产品
export async function removeOrderItem(orderId: number | string, itemId: number | string): Promise<any> {
  const res = await smartFetch(`/orders/${orderId}/remove-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId }),
  });
  if (!res.ok) {
    let errMsg: string;
    try {
      const err = await res.json();
      errMsg = err.message || `Error (${res.status})`;
    } catch {
      errMsg = `Error del servidor (${res.status})`;
    }
    throw new Error(errMsg);
  }
  return res.json();
}

// 结账前库存实时校验
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

export async function stockCheck(items: Array<{ id: number; qty: number }>): Promise<StockCheckResult> {
  const res = await smartFetch('/stock-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: items.map(item => ({ product_id: item.id, quantity: item.qty })) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({})));
    throw new Error(err.message || `Error de verificacion de stock (${res.status})`);
  }
  return res.json();
}
