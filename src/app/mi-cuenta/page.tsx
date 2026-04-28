'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Building2, FileText, MapPin, ChevronRight, AlertCircle, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function MiCuentaContent() {
  const { login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [tab, setTab] = useState<'login' | 'register'>(() =>
    searchParams.get('register') === '1' ? 'register' : 'login'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Register form
  const [regForm, setRegForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    company: '',
    cif_nif: '',
    address_1: '',
    city: '',
    postcode: '',
    province: 'GC',
  });
  const [regSuccess, setRegSuccess] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (regForm.password !== regForm.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (regForm.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: regForm.email,
        password: regForm.password,
        first_name: regForm.first_name,
        last_name: regForm.last_name,
        phone: regForm.phone,
        company: regForm.company,
        cif_nif: regForm.cif_nif,
        address_1: regForm.address_1,
        city: regForm.city,
        postcode: regForm.postcode,
        province: regForm.province,
      });
      setRegSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  function updateReg(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setRegForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-1 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#2563eb] transition">Inicio</Link>
            <ChevronRight size={13} className="text-gray-300" />
            <span className="text-gray-800 font-medium">Mi cuenta</span>
          </nav>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-10">
        {/* Tab switch */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1 mb-6 shadow-sm">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
              tab === 'login'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
              tab === 'register'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Register success */}
        {tab === 'register' && regSuccess ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={28} className="text-green-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">¡Registro exitoso!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Tu cuenta está <strong>pendiente de aprobación</strong>. Te notificaremos por email cuando esté activada.
            </p>
            <button
              onClick={() => {
                setTab('login');
                setRegSuccess(false);
              }}
              className="bg-[#2563eb] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#1d4ed8] transition"
            >
              Iniciar sesión
            </button>
          </div>
        ) : tab === 'login' ? (
          /* Login form */
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@empresa.com"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={16} />
                  Iniciar sesión
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              ¿No tienes cuenta?{' '}
              <button type="button" onClick={() => setTab('register')} className="text-[#2563eb] font-semibold">
                Crear cuenta
              </button>
            </p>
          </form>
        ) : (
          /* Register form */
          <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                <input type="text" required value={regForm.first_name} onChange={updateReg('first_name')} placeholder="Juan" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Apellidos *</label>
                <input type="text" required value={regForm.last_name} onChange={updateReg('last_name')} placeholder="García" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
              <input type="email" required value={regForm.email} onChange={updateReg('email')} placeholder="tu@empresa.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña *</label>
                <input type="password" required minLength={6} value={regForm.password} onChange={updateReg('password')} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar *</label>
                <input type="password" required minLength={6} value={regForm.confirm_password} onChange={updateReg('confirm_password')} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono</label>
                <input type="tel" value={regForm.phone} onChange={updateReg('phone')} placeholder="+34 600 000 000" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Empresa</label>
                <input type="text" value={regForm.company} onChange={updateReg('company')} placeholder="Tu S.L." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">CIF / NIF</label>
              <input type="text" value={regForm.cif_nif} onChange={updateReg('cif_nif')} placeholder="B12345678" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dirección</label>
              <input type="text" value={regForm.address_1} onChange={updateReg('address_1')} placeholder="C/ Mayor 45" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ciudad</label>
                <input type="text" value={regForm.city} onChange={updateReg('city')} placeholder="Las Palmas" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CP</label>
                <input type="text" value={regForm.postcode} onChange={updateReg('postcode')} placeholder="35001" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provincia</label>
              <select value={regForm.province} onChange={updateReg('province')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] bg-white">
                <option value="GC">Gran Canaria</option>
                <option value="TF">Tenerife</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <User size={16} />
                  Crear cuenta
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <button type="button" onClick={() => setTab('login')} className="text-[#2563eb] font-semibold">
                Iniciar sesión
              </button>
            </p>
          </form>
        )}

        {/* WhatsApp help */}
        <div className="mt-6 text-center">
          <a
            href="https://wa.me/34688560560?text=Hola,%20necesito%20ayuda%20con%20mi%20cuenta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#25d366] transition"
          >
            <MessageCircle size={14} />
            ¿Necesitas ayuda? WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MiCuentaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MiCuentaContent />
    </Suspense>
  );
}
