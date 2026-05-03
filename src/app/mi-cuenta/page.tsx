'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { register as apiRegister, requestPasswordReset } from '@/api/auth';
import { getCustomerOrders, getOrder, removeOrderItem } from '@/lib/woocommerce';
import {
  CheckCircle, AlertCircle, Loader, Clock, FileText, MessageCircle,
  User, Mail, Phone, Building, Lock, Eye, EyeOff, RefreshCw,
  MapPin, Map, Package, ChevronRight, ShoppingCart, PackageOpen,
  Trash2, X,
} from 'lucide-react';
import type { ReactNode, FormEvent, ChangeEvent } from 'react';

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
    </div>}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const searchParams = useSearchParams();
  const { login: authLogin, isLoggedIn, isPending, user, logout: authLogout, refreshUser } = useAuth();

  // If already logged in and approved, show profile
  if (isLoggedIn && user) {
    return <LoggedInView user={user} onLogout={() => authLogout()} />;
  }

  const initialMode = (searchParams.get('register') === '1' ? 'register'
    : searchParams.get('forgot') === '1' ? 'forgot'
    : searchParams.get('pending') === '1' ? 'pending'
    : 'login');

  return (
    <AccountSwitcher
      initialMode={initialMode}
      onLoginSuccess={authLogin}
      isPending={isPending}
      user={user}
      onLogout={authLogout}
      refreshUser={refreshUser}
    />
  );
}

/* ───────── Logged-in Dashboard ───────── */
function LoggedInView({ user, onLogout }: { user: any; onLogout: () => Promise<void> }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [orders, setOrders] = useState<any[] | null>(null); // null=loading, []=empty, [...]=loaded
  const [ordersError, setOrdersError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ orderId: number; itemId: number; itemName: string } | null>(null);
  const [removingItem, setRemovingItem] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // 加载订单列表 (等 auth ready 后再请求)
  useEffect(() => {
    let mounted = true;
    // ★ 延迟加载：确保 AuthContext 已初始化，token 可用
    const timer = setTimeout(() => {
      if (!mounted) return;
      getCustomerOrders()
        .then(data => { if (mounted) setOrders(data.orders || []); })
        .catch((e: Error) => { if (mounted) { setOrders([]); setOrdersError(e.message || 'Error al cargar pedidos'); } });
    }, 800);
    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  // 展开/加载订单详情
  async function handleToggleOrder(orderId: number) {
    if (expandedOrder === orderId) { setExpandedOrder(null); return; }
    setExpandedOrder(orderId);
    setOrderDetail(null);
    try {
      const data = await getOrder(orderId);
      setOrderDetail(data.order || null);
    } catch { setOrderDetail(null); }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  }

  // ★ v7.3: 删除订单内单个产品
  async function handleRemoveItem() {
    if (!removeConfirm) return;
    setRemovingItem(true);
    setRemoveError('');
    try {
      const data = await removeOrderItem(removeConfirm.orderId, removeConfirm.itemId);
      if (data.success) {
        // 更新订单详情
        setOrderDetail(data.order || null);
        // 刷新订单列表（更新总额）
        try {
          const listData = await getCustomerOrders();
          setOrders(listData.orders || []);
        } catch (_) { /* 列表刷新失败不影响主流程 */ }
        setRemoveConfirm(null);
      } else {
        setRemoveError(data.message || 'Error al eliminar el producto');
      }
    } catch (err: any) {
      setRemoveError(err.message || 'Error al eliminar el producto');
    } finally {
      setRemovingItem(false);
    }
  }

  // 状态颜色映射 (pending 弱化显示 - 外部收银系统)
  function statusBadge(status: string): ReactNode {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      'pending':   { bg: 'bg-gray-50', text: 'text-gray-400', label: 'En tramitación' },
      'processing':{ bg: 'bg-blue-50', text: 'text-blue-700', label: 'Procesando' },
      'on-hold':   { bg: 'bg-orange-50', text: 'text-orange-700', label: 'En espera' },
      'completed': { bg: 'bg-green-50', text: 'text-green-700', label: 'Completado' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelado' },
      'refunded':  { bg: 'bg-red-50', text: 'text-red-600', label: 'Reembolsado' },
      'failed':    { bg: 'bg-red-100', text: 'text-red-700', label: 'Fallido' },
    };
    const s = map[status] || { bg: 'bg-gray-50', text: 'text-gray-600', label: status };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
  }

  // 支付方式映射
  function paymentLabel(method: string): string {
    if (!method) return '—';
    return method === 'bacs' ? 'Transferencia Bancaria'
         : method === 'cod' ? 'Contra Reembolso'
         : method;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Hola, {user.firstName || user.first_name || user.displayName || 'Cliente'}</h1>
            <p className="text-blue-200 text-sm">{user.company || 'Cliente B2B'} · {user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

        {/* ── 账户资料卡片 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-[#2563eb]" /> Datos de tu cuenta
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <InfoRow label="Nombre" value={`${user.firstName || ''} ${user.lastName || ''}`} />
            <InfoRow label="Email" value={user.email} />
            {user.company && <InfoRow label="Empresa" value={user.company} />}
            {user.phone && <InfoRow label="Telefono" value={user.phone} />}
            <InfoRow label="Estado" value={
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                <CheckCircle size={14} /> Cuenta aprobada
              </span>
            } />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full sm:w-auto border border-gray-200 hover:bg-gray-50 font-semibold py-2.5 px-6 rounded-xl transition flex items-center justify-center gap-2 text-sm text-gray-700 disabled:opacity-50"
            >
              {loggingOut ? <Loader size={16} className="animate-spin" /> : null}
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── 历史订单 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 pb-4 flex items-center justify-between">
            <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-[#2563eb]" /> Historial de pedidos
            </h2>
          </div>

          {/* 订单加载状态 */}
          {orders === null && (
            <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
              <Loader size={28} className="animate-spin text-[#2563eb] mb-3" />
              <p className="text-sm text-gray-500">Cargando tus pedidos...</p>
            </div>
          )}

          {/* 订单为空 */}
          {orders !== null && orders.length === 0 && !ordersError && (
            <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <ShoppingCart size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">No tienes pedidos aun</p>
              <Link href="/tienda" className="mt-2 text-sm text-[#2563eb] font-semibold hover:underline">Ver catalogo</Link>
            </div>
          )}

          {/* 错误 */}
          {ordersError && (
            <div className="px-6 py-8 bg-red-50/50 mx-6 my-3 rounded-xl text-center">
              <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-red-700 text-sm">{ordersError}</p>
            </div>
          )}

          {/* 订单列表 */}
          {orders !== null && orders.length > 0 && (
            <div className="divide-y divide-gray-50">
              {orders.map((o: any) => (
                <div key={o.id}>
                  <button
                    onClick={() => handleToggleOrder(o.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Package size={18} className="text-[#2563eb]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">Pedido #{o.number || o.id}</p>
                        <p className="text-xs text-gray-400">{o.date_created || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-right hidden sm:block">
                        <p className="font-bold text-sm text-gray-900">{parseFloat(o.total || 0).toFixed(2)} €</p>
                      </span>
                      {statusBadge(o.status)}
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${expandedOrder === o.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* 展开的订单详情 */}
                  {expandedOrder === o.id && (
                    <div className="px-6 pb-4 pt-1 bg-gray-50/50">
                      <div className="border-t border-gray-100 pt-3 space-y-3">
                        {orderDetail ? (
                          <>
                            {/* 订单信息 */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-500">Pedido</span><span className="font-medium">#{orderDetail.number || orderDetail.id}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Estado</span>{statusBadge(orderDetail.status)}</div>
                              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold">{parseFloat(orderDetail.total || 0).toFixed(2)} €</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Pago</span><span className="text-xs">{paymentLabel(orderDetail.payment_method)}</span></div>
                              {orderDetail.date_created ? (
                                <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-500">Fecha</span><span>{orderDetail.date_created}</span></div>
                              ) : null}
                            </div>

                            {/* 商品列表 */}
                            {orderDetail.line_items && orderDetail.line_items.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                  <PackageOpen size={13} /> Productos ({orderDetail.line_items.length})
                                </p>
                                <div className="divide-y divide-gray-100 rounded-lg overflow-hidden border border-gray-100 bg-white">
                                  {orderDetail.line_items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 px-3 py-2.5 text-sm group">
                                      {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-10 h-10 object-contain rounded-md bg-gray-50 shrink-0" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-md bg-gray-100 shrink-0 flex items-center justify-center">
                                          <Package size={16} className="text-gray-300" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 text-xs leading-tight truncate">{item.name}</p>
                                        {item.sku ? <p className="text-[10px] text-gray-400 font-mono">SKU: {item.sku}</p> : null}
                                        <p className="text-[11px] text-gray-400 mt-0.5">x{item.quantity}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="font-semibold text-sm text-gray-900">{parseFloat(item.total || 0).toFixed(2)} €</span>
                                      </div>
                                      {/* ★ v7.3: 删除按钮（仅 completed 状态显示，且订单多于1个产品） */}
                                      {orderDetail.status === 'completed' && orderDetail.line_items.length > 1 && (
                                        <button
                                          onClick={() => setRemoveConfirm({ orderId: orderDetail.id, itemId: item.item_id, itemName: item.name })}
                                          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                                          title="Eliminar producto"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-3 text-center text-gray-400 text-sm">
                            <Loader size={16} className="animate-spin inline mr-2" />Cargando detalles...
                          </div>
                        )}

                        {/* ★ v7.3: 删除产品确认对话框 */}
                        {removeConfirm && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !removingItem && setRemoveConfirm(null)}>
                            <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-base">Eliminar producto</h3>
                                <button onClick={() => !removingItem && setRemoveConfirm(null)} className="text-gray-400 hover:text-gray-600">
                                  <X size={18} />
                                </button>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                ¿Seguro que quieres eliminar este producto del pedido?
                              </p>
                              <p className="text-sm font-semibold text-gray-800 mb-4">
                                {removeConfirm.itemName}
                              </p>
                              <p className="text-xs text-gray-400 mb-4">
                                El stock se restaurará automáticamente y el total del pedido se recalculará.
                              </p>
                              {removeError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs mb-4">
                                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                  <span>{removeError}</span>
                                </div>
                              )}
                              <div className="flex gap-3">
                                <button
                                  onClick={() => setRemoveConfirm(null)}
                                  disabled={removingItem}
                                  className="flex-1 border border-gray-200 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition text-sm text-gray-700 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleRemoveItem}
                                  disabled={removingItem}
                                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                                >
                                  {removingItem ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  {removingItem ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-4 pb-8 text-sm text-gray-500">
          Problemas? Contacta por{' '}
          <a href="https://wa.me/34688560560" className="text-[#2563eb] font-semibold hover:underline">WhatsApp</a>
        </div>

      </div>
      <Footer />
    </div>
  );
}

/* ───────── Pending Approval View ───────── */
function PendingView({ user, onLogout, refreshUser }: { user: any; onLogout: () => Promise<void>; refreshUser: () => Promise<any> }) {
  const [checking, setChecking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleCheckStatus() {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-black">Cuenta en revision</h1>
          <p className="text-blue-200 mt-1">Tu solicitud esta siendo procesada</p>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-[#2563eb]/30 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="text-[#2563eb]" size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Cuenta en revision</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Tu registro se ha recibido correctamente. Nuestro equipo esta verificando tu solicitud de cuenta B2B.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-5 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#2563eb]/10 rounded-lg flex items-center justify-center shrink-0">
                <Clock size={20} className="text-[#2563eb]" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Tiempo de espera estimado</p>
                <p className="text-[#2563eb] font-bold text-lg">Menos de 24h laborables</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Las solicitudes se procesan de L a V entre 10:00 y 14:00 (hora Canarias)
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-[#1e3a8a]" />
              <p className="font-semibold text-gray-800 text-sm">Documentacion necesaria</p>
            </div>
            <ul className="space-y-2.5">
              {[
                { label: 'CIF / NIF valido', desc: 'Identificacion fiscal de la empresa' },
                { label: 'Nombre de empresa', desc: 'Razon social o nombre del negocio' },
                { label: 'Direccion fiscal en Canarias', desc: 'Direccion en Gran Canaria o Tenerife' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="w-5 h-5 bg-[#2563eb]/10 text-[#2563eb] rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                  <div>
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <a
            href="https://wa.me/34688560560?text=Hola%2C%20he%20registrado%20mi%20cuenta%20B2B%20en%20GSMGC%20y%20quer%C3%ADa%20acelerar%20la%20revisi%C3%B3n.%20Gracias."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 mb-4"
          >
            <MessageCircle size={18} />
            Acelerar revision por WhatsApp
          </a>

          <p className="text-xs text-gray-400 text-center mb-5">
            Abre WhatsApp con un mensaje predispuesto para agilizar tu aprobacion
          </p>

          <div className="border-t border-gray-100 pt-4 text-center space-y-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="text-sm text-gray-500 hover:text-[#2563eb] transition font-medium flex items-center gap-1.5 mx-auto disabled:opacity-50"
            >
              {checking ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {checking ? 'Comprobando...' : 'Comprobar estado de la cuenta'}
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-sm text-gray-400 hover:text-red-500 transition font-medium flex items-center gap-1.5 mx-auto disabled:opacity-50"
            >
              {loggingOut ? <Loader size={14} className="animate-spin" /> : null}
              Cerrar sesión e iniciar con otra cuenta
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ───────── Auth Switcher ───────── */
function AccountSwitcher({ initialMode = 'login', onLoginSuccess, isPending, user, onLogout, refreshUser }: {
  initialMode?: string; onLoginSuccess: (email: string, password: string) => Promise<any>; isPending: boolean; user: any; onLogout: () => Promise<void>; refreshUser?: () => Promise<any>;
}) {
  const [mode, setMode] = useState(initialMode);

  // Update mode when initialMode changes (e.g., when URL query params change)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // If user is pending approval, show pending view with option to logout
  if (isPending && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PendingView user={user} onLogout={onLogout} refreshUser={refreshUser!} />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'register': return 'Registrarse como cliente B2B';
      case 'forgot': return 'Recuperar contrasena';
      default: return 'Area de clientes B2B';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'register': return 'Solicita acceso como distribuidor o profesional';
      case 'forgot': return 'Te enviaremos instrucciones por email';
      default: return 'Accede a tu cuenta mayorista';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-black">{getTitle()}</h1>
          <p className="text-blue-200 mt-1">{getSubtitle()}</p>
        </div>
      </div>

      <div className={`${mode === 'register' ? 'max-w-2xl' : 'max-w-md'} mx-auto px-4 py-12`}>
        {mode === 'register' && (
          <RegisterForm
            onSwitchToLogin={() => setMode('login')}
            onSuccess={() => setMode('pending')}
          />
        )}
        {mode === 'forgot' && (
          <ForgotPasswordForm
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onLoginSuccess={onLoginSuccess}
            onForgotPassword={() => setMode('forgot')}
          />
        )}

        {/* Help */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Problemas con el acceso? Contacta por{' '}
          <a href="https://wa.me/34688560560" className="text-[#2563eb] font-semibold hover:underline">WhatsApp</a>
          {' '}o email{' '}
          <span className="text-[#2563eb] font-semibold">info@gsmgc.es</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ───────── Forgot Password Form ───────── */
function ForgotPasswordForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Email valido requerido' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={30} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Email enviado</h2>
        <p className="text-gray-500 text-sm mb-4">
          Si el email existe en nuestra base de datos, recibiras instrucciones para restablecer tu contrasena.
        </p>
        <button
          onClick={onSwitchToLogin}
          className="text-[#2563eb] font-semibold hover:underline"
        >
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Mail className="text-[#2563eb]" size={30} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Recuperar contrasena</h2>
        <p className="text-gray-500 text-sm">Introduce tu email y te enviaremos instrucciones</p>
      </div>

      <div className="space-y-4">
        <Field
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          error={errors.email}
          placeholder="tu@empresa.com"
          icon={Mail}
        />
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-sm mb-4 mt-4">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 mt-6"
      >
        {loading ? <Loader size={18} className="animate-spin" /> : <Mail size={18} />}
        {loading ? 'Enviando...' : 'Enviar instrucciones'}
      </button>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm text-gray-500 hover:text-[#2563eb] transition"
        >
          Volver al inicio de sesión
        </button>
      </div>
    </form>
  );
}

/* ───────── Register Form ───────── */
function RegisterForm({ onSwitchToLogin, onSuccess }: { onSwitchToLogin: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', company: '', cifNif: '',
    address: '', city: '', postcode: '', province: 'GC',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (k: string) => (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  /* ★ Password strength indicator (#16) */
  const pwdStrength = (() => {
    const p = form.password;
    if (!p) return { score: 0, label: '', color: '' };
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    const map: Array<{ label: string; color: string }> = [
      { label: 'Muy debil', color: 'bg-red-500' },
      { label: 'Debil', color: 'bg-orange-500' },
      { label: 'Regular', color: 'bg-yellow-500' },
      { label: 'Fuerte', color: 'bg-lime-500' },
      { label: 'Muy fuerte', color: 'bg-green-500' },
    ];
    return { score: s, ...map[s - 1] || map[0] };
  })();

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Requerido';
    if (!form.lastName.trim()) errs.lastName = 'Requerido';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email valido requerido';
    if (!form.password) errs.password = 'Contrasena requerida';
    if (form.password.length < 6) errs.password = 'Minimo 6 caracteres';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Las contrasenas no coinciden';
    if (!form.phone.trim()) errs.phone = 'Requerido';
    if (!form.company.trim()) errs.company = 'Requerido para cuenta B2B';
    if (!form.address.trim()) errs.address = 'Requerido';
    if (!form.city.trim()) errs.city = 'Requerido';
    if (!form.postcode.trim()) errs.postcode = 'Requerido';
    if (form.cifNif && !/^(X|Y|Z)?[0-9]{7}[A-Z]$|^[A-Z][0-9]{7}[0-9A-Z]$|^[0-9]{8}[A-Z]$/i.test(form.cifNif.trim())) {
      errs.cifNif = 'Formato invalido. Ej: 12345678A o A12345678';
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      await apiRegister(form);
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={30} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Registro completado</h2>
        <p className="text-gray-500 text-sm">
          Tu solicitud de cuenta B2B ha sido enviada. Recibiras la confirmacion por email.
        </p>
        <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Siguientes pasos:</p>
          <ol className="text-left space-y-1 text-blue-700 list-decimal pl-4">
            <li>Nuestro equipo revisara tu solicitud (24h laborables)</li>
            <li>Recibiras un email de confirmacion</li>
            <li>Podras acceder a precios mayorista exclusivos</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="text-[#2563eb]" size={30} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Registro de cliente B2B</h2>
        <p className="text-gray-500 text-sm">
          Completa tus datos para solicitar acceso a precios mayorista.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Group 1: Personal Info ── */}
        <SectionGroup icon={User} title="Datos personales" color="blue">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre *" name="firstName" value={form.firstName} onChange={update('firstName')} error={errors.firstName} placeholder="Juan" icon={User} />
            <Field label="Apellidos *" name="lastName" value={form.lastName} onChange={update('lastName')} error={errors.lastName} placeholder="Garcia Lopez" />
          </div>
          <Field label="Email *" type="email" name="email" value={form.email} onChange={update('email')} error={errors.email} placeholder="juan@empresa.com" icon={Mail} />
          <Field label="Telefono *" type="tel" name="phone" value={form.phone} onChange={update('phone')} error={errors.phone} placeholder="+34 600 000 000" icon={Phone} />
        </SectionGroup>

        {/* ── Group 2: Account Security ── */}
        <SectionGroup icon={Lock} title="Seguridad de cuenta" color="red">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Field label="Contrasena *" type="password" name="password" value={form.password} onChange={update('password')} error={errors.password} placeholder="Minimo 6 caracteres" icon={Lock} />
              {form.password && (
                <div className="mt-2 px-1">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwdStrength.score ? pwdStrength.color : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${pwdStrength.score >= 3 ? 'text-green-600' : pwdStrength.score >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                    Fortaleza: {pwdStrength.label || '-'}
                  </p>
                </div>
              )}
            </div>
            <Field label="Confirmar contrasena *" type="password" name="confirmPassword" value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} placeholder="Repite la contrasena" icon={Lock} />
          </div>
        </SectionGroup>

        {/* ── Group 3: Company Info ── */}
        <SectionGroup icon={Building} title="Informacion de empresa" color="purple">
          <Field label="Empresa / Negocio *" name="company" value={form.company} onChange={update('company')} error={errors.company} placeholder="Tu empresa S.L." icon={Building} />
          <Field label="CIF / NIF" name="cifNif" value={form.cifNif} onChange={update('cifNif')} error={errors.cifNif} placeholder="B12345678" hint="Opcional. Se puede anadir despues." />
        </SectionGroup>

        {/* ── Group 4: Address ── */}
        <SectionGroup icon={MapPin} title="Direccion de entrega / fiscal" color="green">
          <Field label="Direccion *" name="address" value={form.address} onChange={update('address')} error={errors.address} placeholder="Calle Principal, 15, Local 3" icon={MapPin} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ciudad *" name="city" value={form.city} onChange={update('city')} error={errors.city} placeholder="Las Palmas de GC" icon={Map} />
            <Field label="Codigo Postal *" name="postcode" value={form.postcode} onChange={update('postcode')} error={errors.postcode} placeholder="35001" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Isla / Provincia *</label>
            <select
              name="province"
              value={form.province}
              onChange={update('province')}
              className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition bg-white"
            >
              <option value="GC">Gran Canaria (GC)</option>
              <option value="TF">Tenerife (TF)</option>
              <option value="LP">La Palma (LP)</option>
              <option value="LG">Lanzarote (LG)</option>
              <option value="FU">Fuerteventura (FU)</option>
              <option value="IH">El Hierro (IH)</option>
              <option value="GC2">La Gomera (GC)</option>
            </select>
          </div>
        </SectionGroup>
      </div>

      {/* Benefits */}
      <div className="bg-blue-50 rounded-xl p-4 my-6 text-sm text-blue-800">
        <p className="font-semibold mb-1">Al registrarte obtienes:</p>
        <ul className="space-y-1 text-blue-700">
          <li>Precios mayorista exclusivos</li>
          <li>Acceso a catalogo completo (2.118 productos)</li>
          <li>Pedidos con pago por transferencia</li>
          <li>Historial de pedidos</li>
        </ul>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-sm mb-4">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
      >
        {loading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
        {loading ? 'Registrando...' : 'Crear cuenta B2B'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3 mb-4">
        Al registrarte aceptas nuestras{' '}
        <Link href="/condiciones-de-venta" className="underline hover:text-gray-600">condiciones de venta</Link>
        {' '}y{' '}
        <Link href="/politica-de-privacidad" className="underline hover:text-gray-600">politica de privacidad</Link>.
      </p>

      <div className="text-center">
        <button type="button" onClick={onSwitchToLogin} className="text-sm text-gray-500 hover:text-[#2563eb] transition">
          Ya tienes cuenta? <span className="font-semibold">Iniciar sesion</span>
        </button>
      </div>
    </form>
  );
}

/* ───────── Login Form ───────── */
function LoginForm({ onSwitchToRegister, onLoginSuccess, onForgotPassword }: {
  onSwitchToRegister: () => void; onLoginSuccess: (email: string, password: string) => Promise<any>; onForgotPassword: () => void;
}) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const update = (k: string) => (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = 'Email requerido';
    if (!form.password) errs.password = 'Contrasena requerida';
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      await onLoginSuccess(form.email, form.password);
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="text-[#2563eb]" size={30} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Iniciar sesion</h2>
        <p className="text-gray-500 text-sm">Accede a tu area de cliente B2B</p>
      </div>

      <div className="space-y-4">
        <Field label="Email" type="email" name="email" value={form.email}
          onChange={update('email')}
          error={errors.email} placeholder="tu@empresa.com" icon={Mail} />
        <div className="relative">
          <Field label="Contrasena" type={showPassword ? 'text' : 'password'} name="password"
            value={form.password}
            onChange={update('password')}
            error={errors.password} placeholder="Tu contrasena" icon={Lock} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-sm mb-4">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 mt-6"
      >
        {loading ? <Loader size={18} className="animate-spin" /> : <Lock size={18} />}
        {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
      </button>

      {/* Forgot password */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-gray-500 hover:text-[#2563eb] transition"
        >
          Olvidaste tu contrasena?
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-6 text-center">
        <button type="button" onClick={onSwitchToRegister} className="text-sm text-gray-500 hover:text-[#2563eb] transition">
          No tienes cuenta? <span className="font-semibold">Registrate</span>
        </button>
      </div>
    </form>
  );
}

/* ───────── Section Group (Register form) ───────── */
function SectionGroup({ icon: Icon, title, children, color = 'blue' }: {
  icon: any; title: string; children: ReactNode; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-50 to-white border-blue-100',
    red: 'from-red-50 to-white border-red-100',
    purple: 'from-purple-50 to-white border-purple-100',
    green: 'from-green-50 to-white border-green-100',
  };
  const iconMap: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-100',
    red: 'text-red-500 bg-red-100',
    purple: 'text-purple-500 bg-purple-100',
    green: 'text-green-500 bg-green-100',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} rounded-xl border p-5`}>
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        {Icon && (
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconMap[color]}`}>
            <Icon size={14} />
          </span>
        )}
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/* ───────── Reusable Field ──────── */
function Field({ label, name, type = 'text', value, onChange, required, placeholder, error, hint, icon: Icon }: {
  label: string; name: string; type?: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void; required?: boolean; placeholder?: string; error?: string; hint?: string; icon?: any;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`w-full border rounded-xl py-3 text-sm focus:outline-none focus:ring-2 transition ${
            Icon ? 'pl-10' : 'pl-4'
          } pr-4 ${
            error
              ? 'border-red-400 focus:ring-red-300 bg-red-50'
              : 'border-gray-200 focus:ring-[#2563eb]/30 focus:border-[#2563eb]'
          }`}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    </div>
  );
}

/* ───────── Info Row ───────── */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
