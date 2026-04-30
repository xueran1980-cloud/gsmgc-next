// WooCommerce REST API — 订单创建（对齐旧站 woocommerce.js）
// Basic Auth 凭据通过环境变量配置，不需要用户登录

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

interface OrderAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  postcode: string;
  country: string;
  state: string;
}

interface CreateOrderRequest {
  payment_method: string;
  payment_method_title: string;
  billing: OrderAddress;
  shipping: OrderAddress;
  line_items: Array<{ product_id: number; quantity: number }>;
  status: string;
  customer_note: string;
  meta_data: Array<{ key: string; value: string }>;
}

interface CreateOrderResponse {
  id: number;
  order_key: string;
  status: string;
  total: string;
  // WC returns more fields, but we only need these
}

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
