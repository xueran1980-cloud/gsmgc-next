// GSMGC Next.js - Auth API 层
// Bearer Token 认证，对接 gsmgc/v1 后端

const API_BASE = 'https://api.gsmgc.es/wp-json/gsmgc/v1';
const TOKEN_KEY = 'gsmgc_token';

// ---------- 类型定义 ----------

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  company: string;
  cif_nif: string;
  address_1: string;
  address_2: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
  roles: string[];
  approved: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
  cif_nif?: string;
  address_1?: string;
  city?: string;
  postcode?: string;
  province?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
}

interface StockCheckItem {
  product_id: number;
  quantity: number;
}

interface StockCheckResponse {
  success: boolean;
  items?: Array<{
    product_id: number;
    available: boolean;
    stock: number;
    requested: number;
  }>;
  message?: string;
}

interface CreateOrderResponse {
  success: boolean;
  order_id?: number;
  message?: string;
}

// ---------- Token 管理 ----------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// ---------- API 请求工具 ----------

async function authFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'GSMGC-Bot/1.0',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // 401 = token 过期或无效
  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data as T;
}

// ---------- Auth API ----------

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await authFetch<{ success: boolean; token?: string; user?: User; message?: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });

  if (!res.success || !res.token || !res.user) {
    throw new Error(res.message || 'Credenciales incorrectas');
  }

  setToken(res.token);
  return { user: res.user, token: res.token };
}

export async function register(data: RegisterRequest): Promise<{ success: boolean; message: string }> {
  const res = await authFetch<{ success: boolean; message?: string }>('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!res.success) {
    throw new Error(res.message || 'Error al registrar');
  }

  return { success: true, message: res.message || 'Registro exitoso' };
}

export async function authCheck(): Promise<User> {
  const res = await authFetch<{ success: boolean; user?: User }>('/auth-check');

  if (!res.success || !res.user) {
    clearToken();
    throw new Error('Sesión no válida');
  }

  return res.user;
}

export async function getMe(): Promise<User> {
  return authCheck();
}

export async function logout(): Promise<void> {
  try {
    await authFetch('/logout', { method: 'POST' });
  } catch {
    // 即使 API 调用失败也清除本地 token
  }
  clearToken();
}

// ---------- Stock Check API ----------

export async function stockCheck(items: StockCheckItem[]): Promise<StockCheckResponse> {
  return authFetch<StockCheckResponse>('/stock-check', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// ---------- Create Order API ----------

interface OrderItem {
  product_id: number;
  quantity: number;
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
  line_items: OrderItem[];
  status: string;
  customer_note: string;
  meta_data: Array<{ key: string; value: string }>;
}

export async function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  const res = await authFetch<CreateOrderResponse>('/create-order', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!res.success) {
    throw new Error(res.message || 'Error al crear el pedido');
  }

  return res;
}
