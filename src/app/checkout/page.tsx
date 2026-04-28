'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, Check, Lock, CreditCard, Banknote, Truck, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { createOrder, stockCheck } from '@/lib/auth';
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
    description: 'Paga en efectivo al recibir el pedido. Se añade un recargo del 2% por gestión.',
    icon: Truck,
    badge: '+2%',
  },
];

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bacs');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    company: '', cif_nif: '', address_1: '', address_2: '', city: '', postcode: '',
    country: 'ES', state: 'GC', order_comments: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill from user data
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        cif_nif: user.cif_nif || '',
        address_1: user.address_1 || '',
        address_2: user.address_2 || '',
        city: user.city || '',
        postcode: user.postcode || '',
        state: user.state || 'GC',
      }));
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated && step === 'form') {
      router.push('/mi-cuenta?redirect=/checkout');
    }
  }, [isAuthenticated, router, step]);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // COD fee
  const codFee = paymentMethod === 'cod' ? totalPrice * 0.02 : 0;
  const finalTotal = totalPrice + codFee;

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'Requerido';
    if (!form.last_name.trim()) errs.last_name = 'Requerido';
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Email válido requerido';
    if (!form.phone.trim()) errs.phone = 'Requerido';
    if (!form.address_1.trim()) errs.address_1 = 'Requerido';
    if (!form.city.trim()) errs.city = 'Requerido';
    if (!form.postcode.trim()) errs.postcode = 'Requerido';
    if (!form.state.trim()) errs.state = 'Requerido';
    if (form.cif_nif && !/^(X|Y|Z)?[0-9]{7}[A-Z]$|^[A-Z][0-9]{7}[0-9A-Z]$|^[0-9]{8}[A-Z]$/i.test(form.cif_nif.trim())) {
      errs.cif_nif = 'Formato inválido. Ej: 12345678A (NIF) o A12345678 (CIF)';
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    setStep('loading');

    try {
      // Stock check before order
      const stockRes = await stockCheck(items.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
      })));

      if (!stockRes.success) {
        throw new Error(stockRes.message || 'Error al verificar stock');
      }

      if (stockRes.items) {
        const outOfStock = stockRes.items.filter((i) => !i.available);
        if (outOfStock.length > 0) {
          const names = outOfStock.map((i) => {
            const item = items.find((it) => it.id === i.product_id);
            return item ? `${item.name} (solicitado: ${i.requested}, disponible: ${i.stock})` : `ID:${i.product_id}`;
          }).join(', ');
          throw new Error(`Productos sin stock suficiente: ${names}`);
        }
      }

      const line_items = items.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
      }));

      const paymentInfo = paymentMethod === 'bacs'
        ? { payment_method: 'bacs', payment_method_title: 'Transferencia Bancaria (BACS)' }
        : { payment_method: 'cod', payment_method_title: 'Contra Reembolso (+2%)' };

      const result = await createOrder({
        ...paymentInfo,
        billing: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          address_1: form.address_1,
          address_2: form.address_2,
          city: form.city,
          postcode: form.postcode,
          country: form.country,
          state: form.state,
        },
        shipping: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          address_1: form.address_1,
          address_2: form.address_2,
          city: form.city,
          postcode: form.postcode,
          country: form.country,
          state: form.state,
        },
        line_items,
        status: 'pending',
        customer_note: form.order_comments || '',
        meta_data: form.cif_nif ? [{ key: '_billing_cif_nif', value: form.cif_nif.trim().toUpperCase() }] : [],
      });

      clearCart();
      setStep('success');
    } catch (err) {
      let errorMessage = 'Error al procesar el pedido. Inténtalo de nuevo.';
      if (err instanceof Error) {
        if (err.message === 'UNAUTHORIZED') {
          errorMessage = 'Sesión expirada. Inicia sesión de nuevo.';
          router.push('/mi-cuenta?redirect=/checkout');
          return;
        }
        errorMessage = err.message;
      }
      setErrorMsg(errorMessage);
      setStep('error');
      setIsSubmitting(false);
    }
  }

  // Empty cart
  if (items.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={40} className="text-gray-300" />
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

  // Success
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
                  <div className="flex justify-between"><span className="text-gray-500">Titular</span><strong>GSMGC Accesorios Móvil</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">IBAN</span><strong className="font-mono">ES85 2100 1501 0002 0083 5441</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">BIC/SWIFT</span><strong>CAIXESBBXXX</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Banco</span><strong>CaixaBank</strong></div>
                </div>
                <p className="text-xs text-blue-600 mt-3 bg-blue-100 rounded-lg p-2">
                  Indica tu nombre y número de pedido en el concepto de la transferencia.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-2xl p-5 mb-6 text-left border border-amber-100">
                <h3 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-2">
                  <Truck size={16} /> Pago contra reembolso
                </h3>
                <p className="text-sm text-gray-700">
                  Prepara el pago en efectivo cuando llegue el repartidor.
                  El importe final incluye el recargo del 2% por gestión.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link href="/tienda" className="bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1d4ed8] transition shadow-md">
                Seguir comprando
              </Link>
              <a
                href="https://wa.me/34688560560"
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

  // Form
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/tienda" className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-black text-gray-900">Finalizar pedido</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={13} />
            Pago seguro SSL
          </div>
        </div>
        {/* Progress steps */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex items-center gap-2 text-xs">
          {['Datos', 'Pago', 'Confirmar'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                i === 0 ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-400'
              }`}>{i + 1}</div>
              <span className={i === 0 ? 'text-[#2563eb] font-semibold' : 'text-gray-400'}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* Form Left */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">

            {/* Datos de facturación */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-5 text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#2563eb] text-white rounded-lg flex items-center justify-center text-sm font-black">1</span>
                Datos de facturación
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Nombre" name="first_name" value={form.first_name} onChange={update('first_name')} required placeholder="Juan" error={errors.first_name} />
                <FormField label="Apellidos" name="last_name" value={form.last_name} onChange={update('last_name')} required placeholder="García López" error={errors.last_name} />
                <FormField label="Email" name="email" type="email" value={form.email} onChange={update('email')} required placeholder="juan@empresa.com" error={errors.email} hint="Recibirás la confirmación aquí" />
                <FormField label="Teléfono" name="phone" type="tel" value={form.phone} onChange={update('phone')} required placeholder="+34 600 000 000" error={errors.phone} />
                <div className="sm:col-span-2">
                  <FormField label="Empresa (opcional)" name="company" value={form.company} onChange={update('company')} placeholder="Tu empresa S.L." />
                </div>
                <div className="sm:col-span-2">
                  <FormField label="CIF / NIF" name="cif_nif" value={form.cif_nif || ''} onChange={update('cif_nif')} placeholder="B12345678" hint="NIF (persona): 12345678A · CIF (empresa): A12345678" error={errors.cif_nif} />
                </div>
              </div>
            </div>

            {/* Dirección de entrega */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-5 text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#2563eb] text-white rounded-lg flex items-center justify-center text-sm font-black">2</span>
                Dirección de entrega
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormField label="Dirección" name="address_1" value={form.address_1} onChange={update('address_1')} required placeholder="C/ Mayor 45" error={errors.address_1} />
                </div>
                <div className="sm:col-span-2">
                  <FormField label="Dirección 2 (piso, portal...)" name="address_2" value={form.address_2} onChange={update('address_2')} placeholder="Portal 2, 3º B" />
                </div>
                <FormField label="Ciudad" name="city" value={form.city} onChange={update('city')} required placeholder="Las Palmas de GC" error={errors.city} />
                <FormField label="Código postal" name="postcode" value={form.postcode} onChange={update('postcode')} required placeholder="35001" error={errors.postcode} />

                {/* Province dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Provincia <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={update('state')}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] bg-white"
                  >
                    <option value="GC">Gran Canaria (ES:GC)</option>
                    <option value="TF">Tenerife (ES:TF)</option>
                  </select>
                  {errors.state && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.state}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notas del pedido <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={form.order_comments}
                  onChange={update('order_comments')}
                  rows={3}
                  placeholder="Instrucciones especiales de entrega, referencia interna de tu empresa..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] resize-none"
                />
              </div>
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-black text-lg mb-5 text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#2563eb] text-white rounded-lg flex items-center justify-center text-sm font-black">3</span>
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
                        selected ? 'border-[#2563eb] bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <input type="radio" name="payment" value={method.id} checked={selected} onChange={() => setPaymentMethod(method.id)} className="sr-only" />
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-[#2563eb] bg-[#2563eb]' : 'border-gray-300'}`}>
                        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-[#2563eb]' : 'bg-gray-100'}`}>
                        <Icon size={20} className={selected ? 'text-white' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${selected ? 'text-[#2563eb]' : 'text-gray-800'}`}>{method.title}</span>
                          <span className="text-xs text-gray-400">{method.subtitle}</span>
                          {method.badge && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto shrink-0">{method.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{method.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* COD warning */}
              {paymentMethod === 'cod' && (
                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Se añade un recargo del <strong>2%</strong> sobre el total por gastos de gestión contra reembolso.
                    Total con recargo: <strong>€{finalTotal.toFixed(2)}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {step === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <strong>Error al procesar el pedido</strong>
                  <p className="mt-1 text-xs">{errorMsg}</p>
                  <a href="https://wa.me/34688560560" className="mt-2 inline-block text-xs font-semibold underline">Contactar por WhatsApp</a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={step === 'loading' || isSubmitting}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:bg-blue-300 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-blue-200 text-lg flex items-center justify-center gap-2"
            >
              {step === 'loading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando pedido...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Confirmar pedido — €{finalTotal.toFixed(2)}
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              Al confirmar aceptas nuestras <Link href="/condiciones-de-venta" className="underline hover:text-gray-600">condiciones de venta</Link>.
            </p>
          </form>

          {/* Order Summary Right */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-32 shadow-sm">
              <h2 className="font-black text-lg mb-4 text-gray-900">Resumen del pedido</h2>

              {/* MOQ hint */}
              {totalPrice < 50 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 leading-snug">
                    <strong>Pedido mínimo €50.</strong> Tu pedido actual es de <strong>€{totalPrice.toFixed(2)}</strong>. ¡Añade más productos para alcanzar el mínimo!
                  </p>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="max-h-12 max-w-12 object-contain" />
                      ) : (
                        <ShoppingBag size={20} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">x{item.qty}</p>
                    </div>
                    <div className="text-sm font-black text-gray-800 shrink-0">
                      €{(parseFloat(item.price || '0') * item.qty).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">€{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío (Canarias)</span>
                  <span className="text-green-600 font-semibold">Gratis</span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600">Recargo COD (2%)</span>
                    <span className="text-amber-600 font-semibold">+€{codFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-400">
                  <span>IGIC (7%)</span>
                  <span>Incluido</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100 items-baseline">
                  <span className="font-black text-gray-900 text-base">TOTAL</span>
                  <span className="font-black text-2xl text-[#2563eb]">€{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {[
                  { icon: Lock, text: 'Pago 100% seguro' },
                  { icon: Truck, text: 'Envío en 24h a Canarias' },
                  { icon: Check, text: 'Garantía 6 meses' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
                    <Icon size={12} className="text-[#2563eb]" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
