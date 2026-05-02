'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Lock, CreditCard, Truck, AlertCircle, User, MapPin, RefreshCw, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { createOrder, stockCheck } from '@/lib/woocommerce';
import { deepCheckAuth, buildBilling } from '@/api/auth';
import PriceWithIGIC, { priceWithIgic } from '@/components/PriceWithIGIC';
import { COMPANY } from '@/config/constants';
import Footer from '@/components/Footer';

function FormField({ label, name, type = 'text', value, onChange, required, placeholder, error, hint }: {
  label: string; name: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string; error?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
          error ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-gray-200 focus:ring-[#2563eb]/30 focus:border-[#2563eb]'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    </div>
  );
}

const PAYMENT_METHODS = [
  {
    id: 'bacs',
    title: 'Transferencia Bancaria',
    subtitle: 'SEPA / BACS',
    description: 'Realiza la transferencia tras confirmar el pedido. Recibirás los datos bancarios por email.',
    icon: CreditCard,
    badge: null,
  },
  {
    id: 'cod',
    title: 'Pago Contra Reembolso',
    subtitle: 'Pagar al recibir',
    description: 'Envío gratuito en pedidos superiores a 200€ (excluyendo pantallas Samsung, pantallas >100€, USB y tarjetas de memoria). No aplicable a pedidos de varios días.',
    icon: Truck,
    badge: null,
  },
];

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, isLoggedIn, refreshUser, setUser, loading } = useAuth();
  const [step, setStep] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bacs');
  const [orderComments, setOrderComments] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  // ★ v5.0: 库存校验中状态
  const [stockChecking, setStockChecking] = useState(false);
  // 手动重试状态（AuthContext 已内置轮询，这里只做手动兜底）
  const [authRetrying, setAuthRetrying] = useState(false);
  // ★ 订单成功数据（从 sessionStorage 恢复）
  const [successData, setSuccessData] = useState<{ orderId: number; paymentMethod: string } | null>(null);
  // ★ v6.3: 防重复提交 — 请求级锁 + 时间窗口
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTime = useRef(0);
  // ★ ORDER-SAFETY: 稳定幂等key — 同一个下单会话复用同一key
  //    之前每次 submit 用 crypto.randomUUID() 生成新key = 无法防重复
  const idempotencyKey = useRef<string>('');

  // ★ v6.1: latestUser ref — 用于 UI 展示，确保 billingInfo 和 orderBilling 用同一个数据源
  //    refreshUser 成功后更新此 ref，billingInfo 从这里读数据而非 state.user
  const latestUserRef = useRef<any>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  // ★ 可编辑的地址字段（用户可直接在结账页补全/修改）
  const [addrFields, setAddrFields] = useState({
    address_1: '',
    city: '',
    postcode: '',
  });

  // ★ 订单成功页：仅在下单成功后的当次会话显示（不恢复）
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('gsmgc_order_success');
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.orderId && data.timestamp) {
          // 只在 5 分钟内且购物车为空时才恢复（用户刚下单后点了刷新）
          const ageMs = Date.now() - data.timestamp;
          if (ageMs < 5 * 60 * 1000 && items.length === 0) {
            setSuccessData(data);
            setStep('success');
            setPaymentMethod(data.paymentMethod || 'bacs');
          } else {
            // 购物车有商品或超过5分钟 = 用户来结账新订单，清除旧状态
            sessionStorage.removeItem('gsmgc_order_success');
          }
        }
      }
    } catch {
      sessionStorage.removeItem('gsmgc_order_success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ★ 离开结账页时清除成功状态（用户点"继续购物"后不应再显示）
  useEffect(() => {
    if (step === 'success') return;
    sessionStorage.removeItem('gsmgc_order_success');
  }, [step]);

  // 进入结账页时自动刷新用户资料，确保使用最新数据
  useEffect(() => {
    if (isLoggedIn && refreshUser) {
      setIsRefreshing(true);
      refreshUser().then((freshUser) => {
        if (freshUser) latestUserRef.current = freshUser; // ★ v6.1: 更新 ref
      }).finally(() => setIsRefreshing(false));
    }
  }, [isLoggedIn, refreshUser]);

  // ★ 关键修复：如果 AuthContext 初始化时没检测到登录（SGCaptcha warmup 竞态），
  //   进入 /checkout 后自动用 deepCheckAuth 再试一次
  useEffect(() => {
    if (!isLoggedIn && !authRetrying && !loading) {
      const timer = setTimeout(async () => {
        try {
          setAuthRetrying(true);
          const result = await deepCheckAuth();
          if (result.authenticated && result.user && result.user.id) {
            if (setUser) setUser(result.user);
            latestUserRef.current = result.user; // ★ v6.1
          }
        } catch (e) {
          console.warn('[GSMGC] CheckoutPage: auth recovery failed', e);
        } finally {
          setAuthRetrying(false);
        }
      }, 1500); // 等 1.5s 让 SGCaptcha 充分完成
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, authRetrying, loading, setUser]);

  // ★ v6.1: 从 activeUser 初始化地址编辑字段（仅首次加载时）
  useEffect(() => {
    const src = latestUserRef.current || user;
    if (src) {
      setAddrFields(prev => ({
        address_1: prev.address_1 || src?.address_1 || src?.billing?.address_1 || src?.billing?.address1 || src?.shipping?.address_1 || src?.direccion || '',
        city: prev.city || src?.city || src?.billing?.city || src?.shipping?.city || src?.ciudad || '',
        postcode: prev.postcode || src?.postcode || src?.billing?.postcode || src?.shipping?.postcode || src?.codigo_postal || src?.postal || '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // 仅当用户切换时重新初始化

  // ★ v6.2: 判断用户数据是否已加载（用于骨架屏 vs 实际内容切换）
  const userDataReady = !!latestUserRef.current || !!user;

  // ★ v6.1: 从用户数据构建账单和配送信息
  //    优先用 latestUserRef.current（/me API 确认过的最新数据）
  //    兜底用 state.user（init 成功后刷新页面时 ref 还没被 useEffect 填充的场景）
  const activeUser = latestUserRef.current || user;

  // ★ v7.0: 用 buildBilling() 统一构建 — 不再猜测字段名
  const billingInfo = buildBilling(activeUser, addrFields) || {
    first_name: '', last_name: '', email: '', phone: '', company: '', cif_nif: '',
    address_1: '', address_2: '', city: '', postcode: '', state: 'GC', country: 'ES',
  };

  // 验证用户信息是否完整（B2B 核心字段 + 地址必填）
  function validateUserInfo() {
    const errs: Record<string, string> = {};
    if (!billingInfo.first_name?.trim()) errs.first_name = 'Falta nombre en tu perfil';
    if (!billingInfo.last_name?.trim()) errs.last_name = 'Falta apellidos en tu perfil';
    if (!billingInfo.email?.trim() || !billingInfo.email.includes('@')) errs.email = 'Email inválido en tu perfil';
    // ★ B2B 地址必填：配送和发票都需要，缺地址会导致 create-order 后端报错
    if (!billingInfo.address_1?.trim()) errs.address_1 = 'Falta dirección en tu perfil';
    if (!billingInfo.city?.trim()) errs.city = 'Falta ciudad en tu perfil';
    if (!billingInfo.postcode?.trim()) errs.postcode = 'Falta código postal en tu perfil';
    return errs;
  }

  // COD手续费已取消
  const codFee = 0;
  const finalTotal = totalPrice;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // ★ v6.3: 防重复提交 — 请求级锁 + 5 秒冷却期
    if (isSubmitting) {
      console.warn('[GSMGC] Checkout: submit blocked, request already in-flight');
      return;
    }
    const now = Date.now();
    if (now - lastSubmitTime.current < 5000) {
      console.warn('[GSMGC] Checkout: submit throttled, too fast');
      return;
    }
    lastSubmitTime.current = now;
    setIsSubmitting(true);
    setErrors({});

    try {
    // ★ v5.8.4: 下单前强制刷新用户数据 — 严格模式
    let latestUser: any = null;
    try {
      latestUser = await refreshUser();
      if (!latestUser || !latestUser.id) {
        console.error('[GSMGC] Checkout: refreshUser returned null/empty, blocking order');
        setErrorMsg('Sesión expirada o inválida. Por favor, recarga la página e inicia sesión de nuevo.');
        setStep('error');
        return;
      }
      latestUserRef.current = latestUser; // ★ v6.1: 更新 ref
      console.log('[GSMGC] Checkout: refreshed user before order', latestUser.id, latestUser.email);
    } catch (refreshErr) {
      // ★ v6.1: AUTH_EXPIRED 单独提示，不 reload（保留表单数据让用户手动重试）
      if ((refreshErr as Error).message === 'AUTH_EXPIRED') {
        console.error('[GSMGC] Checkout: AUTH_EXPIRED during refreshUser');
        setErrorMsg('Tu sesión ha expirado. Por favor, cierra sesión y vuelve a iniciar.');
      } else {
        console.error('[GSMGC] Checkout: refreshUser threw error, blocking order:', refreshErr);
        setErrorMsg('Error de conexión al verificar tu sesión. Recarga la página e inténtalo de nuevo.');
      }
      setStep('error');
      return;
    }

    // ★ v6.0: 安全校验 — 确保 refreshUser 返回的用户就是当前登录的用户
    if (user && user.id && latestUser.id !== user.id) {
      console.error('[GSMGC] Checkout: user ID mismatch!', { cached: user.id, fresh: latestUser.id });
      setErrorMsg('Error de sesión. Se han detectado datos de otra cuenta. Por favor, cierra sesión y vuelve a entrar.');
      setStep('error');
      return;
    }

    // ★ v6.0: 校验 email 一致性
    const billingEmail = latestUser?.email || latestUser?.billing?.email || '';
    if (!billingEmail || !billingEmail.includes('@')) {
      console.error('[GSMGC] Checkout: latestUser has no valid email', latestUser);
      setErrorMsg('Error: datos de usuario incompletos. Contacta por WhatsApp.');
      setStep('error');
      return;
    }

    const errs = validateUserInfo();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // ── 第一层：本地快速校验（基于缓存数据，即时返回）──
    const stockErrors: string[] = [];
    items.forEach(item => {
      if (item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity >= 0) {
        if (item.qty > item.stock_quantity) {
          stockErrors.push(`${item.name} (SKU: ${item.sku || item.id}): solicitado ${item.qty}, disponible ${item.stock_quantity}`);
        }
      }
    });
    if (stockErrors.length > 0) {
      setErrorMsg('Stock insuficiente en los siguientes productos:\n• ' + stockErrors.join('\n• '));
      setStep('error');
      return;
    }

    // ── 第二层：★ v5.0 实时库存 API 校验（服务端最新数据）──
    setStockChecking(true);
    try {
      const stockResult = await stockCheck(items);

      if (!stockResult.ok && Array.isArray(stockResult.insufficient) && stockResult.insufficient.length > 0) {
        const insufficientLines = stockResult.insufficient.map(s => {
          const statusText = s.status === 'outofstock' ? 'agotado' : `disponible: ${s.stock_quantity}`;
          return `• ${s.name} (${s.sku}): solicitado ${s.requested}, ${statusText}`;
        });

        setErrorMsg(
          'Uno o más productos ya no tienen stock suficiente:\n' +
          insufficientLines.join('\n') +
          '\n\nPor favor, modifica tu carrito e intenta de nuevo.'
        );
        setStep('error');
        return;
      }
    } catch (stockErr) {
      // ★ v6.1: AUTH_EXPIRED 阻止下单
      if ((stockErr as Error).message === 'AUTH_EXPIRED') {
        setErrorMsg('Tu sesión ha expirado. Por favor, cierra sesión y vuelve a iniciar.');
        setStep('error');
        return;
      }
      // 其他网络问题不阻止下单，让后端 409 兜底
      console.warn('[GSMGC] Stock check API failed, falling back to server-side validation:', (stockErr as Error).message);
    } finally {
      setStockChecking(false);
    }

    setStep('loading');

    // ★ v7.0: 用 buildBilling() 统一构建
    const orderBilling = buildBilling(latestUser, addrFields) || {
      first_name: '', last_name: '', email: '', phone: '', company: '', cif_nif: '',
      address_1: '', address_2: '', city: '', postcode: '', state: 'GC', country: 'ES',
    };
    const orderCifNif = latestUser?.cifNif || '';

    try {
      const line_items = items.map(item => ({
        product_id: item.id,
        quantity: item.qty,
      }));

      // ★ ORDER-SAFETY: 生成并缓存稳定幂等key — 整个下单会话共享同一key
      if (!idempotencyKey.current) {
        idempotencyKey.current = `gsmgc-${latestUser.id}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      }

      // ★ ORDER-SAFETY: 记录下单前购物车快照（用于失败追溯）
      const cartSnapshot = items.map(item => ({
        id: item.id, sku: item.sku, name: item.name, qty: item.qty,
        price: item.price, subtotal: (parseFloat(item.price || '0') * item.qty).toFixed(2)
      }));
      const orderRequestPayload = {
        userId: latestUser.id,
        email: orderBilling.email,
        idempotencyKey: idempotencyKey.current,
        cartSize: items.length,
        cartTotal: totalPrice.toFixed(2),
        cartSnapshot,
        timestamp: new Date().toISOString(),
      };
      console.log('[ORDER-SAFETY] 📦 Creating order:', JSON.stringify(orderRequestPayload, null, 2));

      const paymentInfo = paymentMethod === 'bacs'
        ? { payment_method: 'bacs', payment_method_title: 'Transferencia Bancaria (BACS)' }
        : { payment_method: 'cod', payment_method_title: 'Contra Reembolso' };

      const result = await createOrder({
        ...paymentInfo,
        // ★ ORDER-SAFETY: 稳定幂等key — 同一会话复用，后端用此防重复
        idempotency_key: idempotencyKey.current,
        billing: orderBilling,
        shipping: {
          first_name: orderBilling.first_name,
          last_name: orderBilling.last_name,
          company: orderBilling.company,
          address_1: orderBilling.address_1,
          address_2: orderBilling.address_2,
          city: orderBilling.city,
          postcode: orderBilling.postcode,
          country: orderBilling.country,
          state: orderBilling.state,
        },
        line_items,
        status: 'pending',
        customer_note: orderComments || '',
        meta_data: orderCifNif ? [{ key: '_billing_cif_nif', value: orderCifNif.trim().toUpperCase() }] : [],
      });

      // Order created successfully — persist success state to sessionStorage
      // ★ ORDER-SAFETY: 数据一致性校验
      const wcTotal = result.total ? parseFloat(result.total) : 0;
      const frontendTotal = parseFloat(totalPrice.toFixed(2));
      const itemCountMatch = result.line_items ? result.line_items.length === items.length : true;
      const userIdMatch = result.customer_id ? result.customer_id === latestUser.id : true;

      const consistencyReport = {
        orderId: result.id || result.order_id,
        frontendTotal, wcTotal,
        totalMatch: Math.abs(frontendTotal - wcTotal) < 0.02,
        itemCountMatch,
        userIdMatch,
        frontendItems: items.length, wcItems: result.line_items?.length || 'N/A',
        frontendUserId: latestUser.id, wcUserId: result.customer_id || 'N/A',
      };

      console.log('[ORDER-SAFETY] ✅ Order created:', JSON.stringify({
        ...consistencyReport,
        wcStatus: result.status,
        wcTotal: result.total,
      }, null, 2));

      if (!consistencyReport.totalMatch) {
        console.warn('[ORDER-SAFETY] ⚠️ TOTAL MISMATCH:', JSON.stringify(consistencyReport));
      }
      if (!consistencyReport.itemCountMatch) {
        console.warn('[ORDER-SAFETY] ⚠️ ITEM COUNT MISMATCH:', JSON.stringify(consistencyReport));
      }
      if (!consistencyReport.userIdMatch) {
        console.error('[ORDER-SAFETY] 🚨 USER ID MISMATCH — possible cross-account order!', JSON.stringify(consistencyReport));
      }

      const orderSuccessData = {
        orderId: result.id || result.order_id || Date.now(),
        paymentMethod: paymentMethod,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('gsmgc_order_success', JSON.stringify(orderSuccessData));
      setSuccessData(orderSuccessData);
      clearCart();
      setStep('success');
    } catch (err) {
      // ★ ORDER-SAFETY: 详细失败日志 — 包含用户ID、时间、原因
      const failLog = {
        userId: latestUser?.id || user?.id || 'unknown',
        email: latestUser?.email || user?.email || 'unknown',
        idempotencyKey: idempotencyKey.current || 'not_generated',
        cartSize: items.length,
        cartTotal: totalPrice.toFixed(2),
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      };
      console.error('[ORDER-SAFETY] ❌ Order FAILED:', JSON.stringify(failLog, null, 2));

      let errorMessage = 'Error al procesar el pedido. Inténtalo de nuevo.';

      if (err instanceof Error && err.message) {
        if (err.message === 'AUTH_EXPIRED') {
          errorMessage = 'Tu sesión ha expirado durante el proceso. Por favor, recarga la página e inténtalo de nuevo.';
        } else if (err.message.includes('403')) {
          errorMessage = 'Error de autenticación del sistema de pedidos. Contacta con nosotros.';
        } else if (err.message.includes('insuficiente') || err.message.includes('INSUFFICIENT_STOCK') || err.message.includes('409')) {
          errorMessage = 'Uno o más productos ya no tienen stock suficiente. Revisa tu carrito.';
        } else if (err.message.includes('credentials')) {
          errorMessage = 'Sistema de pedidos temporalmente no disponible. Contáctanos por WhatsApp.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
        } else {
          errorMessage = err.message;
        }
      }

      setErrorMsg(errorMessage);
      setStep('error');
    } finally {
      // ★ v6.3: 无论成功/失败，都释放提交锁
    }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── 正在加载认证状态 ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
            <div className="skeleton-shimmer h-5 w-36 rounded" />
            <div className="ml-auto skeleton-shimmer h-4 w-28 rounded" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form skeleton */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="skeleton-shimmer h-4 w-36 rounded mb-4" />
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-shimmer h-4 w-48 rounded" />
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="skeleton-shimmer h-3 w-40 rounded mb-3" />
                  <div className="space-y-2.5">
                    <div className="skeleton-shimmer h-10 rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="skeleton-shimmer h-10 rounded-xl" />
                      <div className="skeleton-shimmer h-10 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="skeleton-shimmer h-5 w-40 rounded mb-5" />
                {[1,2].map(i => (
                  <div key={i} className="skeleton-shimmer h-20 rounded-xl mb-3" />
                ))}
              </div>
              <div className="skeleton-shimmer h-12 rounded-2xl" />
            </div>
            {/* Summary skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-32">
                <div className="skeleton-shimmer h-5 w-36 rounded mb-4" />
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3 mb-4">
                    <div className="skeleton-shimmer w-14 h-14 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                      <div className="skeleton-shimmer h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="skeleton-shimmer h-4 w-24 rounded" />
                  <div className="skeleton-shimmer h-8 w-32 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 未登录（auth 已完成加载，确认真的没登录）──
  if (!isLoggedIn && step !== 'success') {
    const isPendingUser = user && (user.isPending || user.account_status === 'pending');
    const isRetrying = authRetrying && !isPendingUser;

    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div className="max-w-md">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isPendingUser ? 'bg-amber-50' :
              isRetrying ? 'bg-blue-50 animate-pulse' :
              'bg-blue-50'
            }`}>
              {isRetrying ? (
                <RefreshCw size={40} className="text-[#2563eb] animate-spin" />
              ) : isPendingUser ?
                <AlertCircle size={40} className="text-amber-500" /> :
                <User size={40} className="text-[#2563eb]" />
              }
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">
              {isPendingUser ? 'Cuenta en revisión' :
               isRetrying ? 'Verificando sesión...' :
               'Inicia sesión para continuar'}
            </h2>
            <p className="text-gray-500 mb-6">
              {isPendingUser
                ? 'Tu cuenta está pendiente de aprobación. Te notificaremos por email cuando sea activada.'
                : isRetrying
                ? 'Estamos verificando tu estado de inicio de sesión, un momento por favor...'
                : 'Debes iniciar sesión con tu cuenta aprobada para realizar pedidos.'}
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              {!isPendingUser && !isRetrying && (
                <Link href="/mi-cuenta" className="bg-[#2563eb] text-white font-bold px-8 py-3 rounded-xl inline-block hover:bg-[#1d4ed8] transition shadow-lg">
                  Iniciar sesión
                </Link>
              )}
              {/* 手动重新验证按钮 */}
              {!isPendingUser && !isLoggedIn && (
                <button
                  onClick={async () => {
                    setAuthRetrying(true);
                    try {
                      const result = await deepCheckAuth();
                      if (result.authenticated && result.user && result.user.id) {
                        if (setUser) setUser(result.user);
                        latestUserRef.current = result.user; // ★ v6.1
                      }
                    } finally {
                      setAuthRetrying(false);
                    }
                  }}
                  disabled={authRetrying}
                  className={`${isRetrying ? 'bg-[#2563eb] text-white shadow-lg' : 'border border-gray-200'} font-bold px-8 py-3 rounded-xl ${!isRetrying ? 'hover:bg-gray-50' : ''} transition flex items-center gap-2`}
                >
                  {authRetrying && <RefreshCw size={16} className="animate-spin" />}
                  {authRetrying ? 'Verificando...' : 'Reintentar'}
                </button>
              )}
              {!isRetrying && (
                <Link href="/tienda" className={`${!isPendingUser ? 'border border-gray-200' : 'bg-[#2563eb] text-white shadow-lg'} font-bold px-8 py-3 rounded-xl ${isPendingUser ? 'hover:bg-[#1d4ed8]' : 'hover:bg-gray-50'} transition`}>
                  Seguir comprando
                </Link>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Carrito vacío ──
  if (items.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart size={40} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Tu carrito está vacío</h2>
            <p className="text-gray-500 mb-6">Añade productos antes de finalizar el pedido</p>
            <Link href="/tienda" className="bg-[#2563eb] text-white font-bold px-8 py-3 rounded-xl inline-block hover:bg-[#1d4ed8] transition shadow-lg">
              Ver catálogo
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Pedido confirmado ──
  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center text-center px-4 py-16">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">¡Pedido recibido!</h1>
            <p className="text-gray-500 mb-8">Gracias por tu pedido. Te hemos enviado una confirmación por email.</p>

            {paymentMethod === 'bacs' ? (
              <div className="bg-blue-50 rounded-2xl p-5 mb-6 text-left border border-blue-100">
                <h3 className="font-bold text-sm text-[#2563eb] mb-3 flex items-center gap-2">
                  <CreditCard size={16} /> Datos bancarios para la transferencia
                </h3>
                <div className="space-y-1.5 text-sm text-gray-700">
                  <div className="flex justify-between"><span className="text-gray-500">Titular</span><strong>{COMPANY.name}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">IBAN</span><strong className="font-mono">{COMPANY.bank.iban}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">BIC/SWIFT</span><strong>{COMPANY.bank.bic}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Banco</span><strong>{COMPANY.bank.bankName}</strong></div>
                </div>
                <p className="text-xs text-blue-600 mt-3 bg-blue-100 rounded-lg p-2">
                  Indica tu nombre y número de pedido en el concepto de la transferencia.
                </p>
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg p-2">
                  Por favor, espera a recibir nuestra factura antes de realizar la transferencia.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-2xl p-5 mb-6 text-left border border-amber-100">
                <h3 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-2">
                  <Truck size={16} /> Pago contra reembolso
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Se ofrece envío gratuito para pedidos únicos superiores a 200€. Esta oferta no se aplica a pedidos realizados en diferentes días.
                  (Excluyendo pantallas Samsung, pantallas con pedido superior a 100€, unidades USB y tarjetas de memoria).
                  Enviaremos el pedido tras confirmar el pago. No se aceptan cambios ni devoluciones, salvo problemas de calidad del producto.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link href="/tienda" className="bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1d4ed8] transition shadow-md">
                Seguir comprando
              </Link>
                <a
                href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent('Hola! Acabo de realizar el pedido #' + (successData?.orderId || '') + ' y tengo una consulta sobre mi pedido. Gracias.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-200 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition"
                >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Formulario ──
  try {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/tienda" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-black text-gray-900">Finalizar pedido</h1>
          <div className="ml-auto flex items-center gap-3">
            {isRefreshing && (
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" />
                Actualizando datos...
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* ── Form Left ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">

            {/* ★ v6.2: 精简用户信息摘要 — 骨架屏 / 实际内容 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  <User size={16} className="text-[#2563eb]" />
                  Datos de facturación
                </h2>
                <Link href="/mi-cuenta" className="text-xs text-gray-400 hover:text-[#2563eb] hover:underline font-medium">
                  Mi cuenta →
                </Link>
              </div>

              {!userDataReady ? (
                /* ★ v6.2: 用户数据加载中 — 显示骨架屏 */
                <div className="space-y-3 animate-pulse">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="skeleton-shimmer h-4 w-32 rounded" />
                    <div className="skeleton-shimmer h-4 w-48 rounded" />
                    <div className="skeleton-shimmer h-4 w-24 rounded" />
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <div className="skeleton-shimmer h-3 w-40 rounded mb-3" />
                    <div className="space-y-2.5">
                      <div className="skeleton-shimmer h-10 rounded-xl w-full" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="skeleton-shimmer h-10 rounded-xl" />
                        <div className="skeleton-shimmer h-10 rounded-xl" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <>
              {Object.keys(errors).length > 0 && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-700">
                    <strong>Faltan datos</strong> — Por favor completa tu perfil antes de continuar.
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="font-semibold text-gray-800">{billingInfo.first_name} {billingInfo.last_name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600">{billingInfo.email}</span>
                {billingInfo.phone && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{billingInfo.phone}</span>
                  </>
                )}
                {billingInfo.company && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{billingInfo.company}</span>
                    {billingInfo.cif_nif && <span className="font-mono text-gray-500 text-xs">({billingInfo.cif_nif})</span>}
                  </>
                )}
              </div>

              {/* ★ 可编辑的地址字段 — 直接在结账页补全，无需跳转 /mi-cuenta */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-600 mb-2.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#2563eb]" />
                  Dirección de entrega / facturación <span className="text-red-500">*</span>
                </p>

                {Object.keys(errors).length > 0 && (
                  <div className="mb-2.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-amber-700">
                      Completa los campos marcados para continuar.
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <FormField
                    label="Dirección"
                    name="address_1"
                    value={addrFields.address_1}
                    onChange={(e) => setAddrFields(prev => ({ ...prev, address_1: e.target.value }))}
                    placeholder="Calle Principal, 15, Local 3"
                    error={errors.address_1}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label="Ciudad"
                      name="city"
                      value={addrFields.city}
                      onChange={(e) => setAddrFields(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Las Palmas de GC"
                      error={errors.city}
                    />
                    <FormField
                      label="Código Postal"
                      name="postcode"
                      value={addrFields.postcode}
                      onChange={(e) => setAddrFields(prev => ({ ...prev, postcode: e.target.value }))}
                      placeholder="35001"
                      error={errors.postcode}
                    />
                  </div>
                </div>
              </div>

              {/* 订单备注 */}
              <div className="mt-4 pt-3 border-t border-gray-50">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Notas del pedido <span className="font-normal text-gray-300">(opcional)</span>
                </label>
                <textarea
                  value={orderComments}
                  onChange={(e) => setOrderComments(e.target.value)}
                  rows={2}
                  placeholder="Instrucciones especiales, referencia interna..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] resize-none"
                />
              </div>
              </>
              )}
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-5 text-gray-900 flex items-center gap-2">
                <Lock size={18} className="text-[#2563eb]" />
                Método de pago
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const selected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selected
                          ? 'border-[#2563eb] bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={selected}
                        onChange={() => setPaymentMethod(method.id)}
                        className="sr-only"
                      />
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'border-[#2563eb] bg-[#2563eb]' : 'border-gray-300'
                      }`}>
                        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selected ? 'bg-[#2563eb]' : 'bg-gray-100'
                      }`}>
                        <Icon size={20} className={selected ? 'text-white' : 'text-gray-500'} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${selected ? 'text-[#2563eb]' : 'text-gray-800'}`}>
                            {method.title}
                          </span>
                          <span className="text-xs text-gray-400">{method.subtitle}</span>
                          {method.badge && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto shrink-0">
                              {method.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{method.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {step === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <strong>Error al procesar el pedido</strong>
                  <p className="mt-1 text-xs whitespace-pre-line">{errorMsg}</p>
                  <a href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent('Hola! Tuve un problema al intentar realizar un pedido en GSMGC. ¿Podrían ayudarme? Gracias.')}`} className="mt-2 inline-block text-xs font-semibold underline">
                    Contactar por WhatsApp
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || step === 'loading' || stockChecking}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:bg-blue-300 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-blue-200 text-lg flex items-center justify-center gap-2"
            >
              {stockChecking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando stock en tiempo real...
                </>
              ) : (isSubmitting || step === 'loading') ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando pedido...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Confirmar pedido — {priceWithIgic(finalTotal).toFixed(2)} €
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              Al confirmar aceptas nuestras <Link href="/condiciones-de-venta" className="underline hover:text-gray-600">condiciones de venta</Link>.
            </p>
          </form>

          {/* ── Order Summary Right ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-32 shadow-sm">
              <h2 className="font-black text-lg mb-4 text-gray-900">Resumen del pedido</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                {items.map(item => {
                  // ★ 库存状态
                  const isOverStock = (item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity >= 0) && (item.qty > item.stock_quantity);
                  const isAtLimit = (item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity >= 0) && (item.qty === item.stock_quantity);

                  return (
                    <div key={item.id} className={`flex gap-3 items-start ${isOverStock ? 'bg-red-50 rounded-xl p-2 -m-2' : ''}`}>
                      <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="max-h-12 max-w-12 object-contain" />
                        ) : (
                          <ShoppingCart size={20} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold line-clamp-2 leading-snug ${isOverStock ? 'text-red-700' : 'text-gray-800'}`}>{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`text-xs ${isOverStock ? 'text-red-600 font-bold' : 'text-gray-400'}`}>x{item.qty}</p>
                          {isOverStock && (
                            <span className="text-xs text-red-500 font-medium">⚠ Máx: {item.stock_quantity}</span>
                          )}
                          {isAtLimit && !isOverStock && (
                            <span className="text-xs text-orange-500">Stock máximo</span>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm font-black shrink-0 ${isOverStock ? 'text-red-600' : 'text-gray-800'}`}>
                        €{(parseFloat(item.price || '0') * item.qty).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal (Base)</span>
                  <div className="text-right">
                    <span className="font-semibold">{totalPrice.toFixed(2)} €</span>
                    <span className="text-gray-400 text-xs ml-2">IGIC {priceWithIgic(totalPrice).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100 items-baseline">
                  <span className="font-black text-gray-900 text-base">TOTAL (Base)</span>
                  <div>
                    <span className="font-black text-2xl text-[#2563eb]">{finalTotal.toFixed(2)} €</span>
                    <span className="font-bold text-gray-600 text-sm ml-2">IGIC {priceWithIgic(finalTotal).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>IGIC (7%)</span>
                  <span>No incluido</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
  } catch (err) {
    console.error('[GSMGC] CheckoutPage RENDER ERROR:', err);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg w-full">
          <h2 className="text-lg font-bold text-red-700 mb-2">⚠️ Error en la página de checkout</h2>
          <p className="text-sm text-red-600 mb-4">Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.</p>
          <Link href="/tienda" className="bg-[#2563eb] text-white font-bold px-6 py-2 rounded-xl inline-block">Volver a la tienda</Link>
        </div>
      </div>
    );
  }
}
