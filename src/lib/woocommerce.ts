// WooCommerce REST API — 订单创建 + 库存校验 + 订单查询
// 对齐旧站 woocommerce.js: createOrder 走 smartFetch（带 Bearer token）
// createOrderWC 保留走 WC Basic Auth（无登录结账备用）

import { smartFetch } from '@/api/auth';

const WC_SITE = 'https://api.gsmgc.es';
const WC_ENDPOINT = `${WC_SITE}/wp-json/wc/v3`;

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
}

interface CreateOrderResponse {
  id: number;
  order_id?: number;
  order_key: string;
  status: string;
  total: string;
}

// ★ 对齐旧站：createOrder 走 smartFetch（带 Bearer token），不是 WC Basic Auth
export async function createOrder(orderData: Record<string, unknown>): Promise<CreateOrderResponse> {
  const res = await smartFetch('/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  // ★ v5.0.3: 检测 HTML 响应（后端 Fatal Error 泄漏的 WordPress 页面）
  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  if (ct.includes('text/html')) {
    console.error('[GSMGC] create-order received HTML response (Fatal Error leak)');
    throw new Error('El servidor encontro un error interno. Por favor, contacta con nosotros por WhatsApp.');
  }

  if (!res.ok) {
    let errMsg: string;
    try {
      const err = await res.json();
      // ★ 防止 HTML 内容泄漏到 UI
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

// WC Basic Auth 备用下单（无登录场景）
export async function createOrderWC(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
  const auth = getBasicAuthHeader();

  const res = await fetch(`${WC_ENDPOINT}/orders`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'User-Agent': 'GSMGC-Frontend/1.0',
    },
    body: JSON.stringify(orderData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al crear el pedido (${res.status})`);
  }

  return res.json();
}

// ★ 对齐旧站：获取客户订单列表
export async function getCustomerOrders(): Promise<any> {
  const res = await smartFetch('/my-orders');
  if (!res.ok) throw new Error('Error al obtener pedidos');
  return res.json();
}

// ★ 对齐旧站：获取单个订单详情
export async function getOrder(orderId: number | string): Promise<any> {
  const res = await smartFetch(`/orders/${orderId}`);
  if (!res.ok) throw new Error('Error al obtener el pedido');
  return res.json();
}

// ★ v7.3: 删除订单内单个产品（恢复库存 + 重算总额）
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

// ★ v5.0: 结账前库存实时校验
// 调用后端 /gsmgc/v1/stock-check 端点，验证购物车中每个产品的最新库存
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
