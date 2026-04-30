'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, ExternalLink, Clock, FileText,
  MessageCircle, ChevronRight, AlertCircle,
} from 'lucide-react';

const WP_SITE = 'https://api.gsmgc.es';

function MiCuentaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get('register') === '1' ? 'register' :
                       searchParams.get('pending') === '1' ? 'pending' : 'login';
  const [mode, setMode] = useState(initialMode);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-black">
            {mode === 'login' ? 'Area de clientes B2B' : mode === 'register' ? 'Registrarse como cliente B2B' : 'Cuenta en revisión'}
          </h1>
          <p className="text-blue-200 mt-1">
            {mode === 'login'
              ? 'Accede a tu cuenta mayorista'
              : 'Solicita acceso como distribuidor o profesional'}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-12">
        {mode === 'register' ? (
          /* ── Register panel ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="text-[#2563eb]" size={30} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Registro de cliente B2B</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                El registro se realiza a través de nuestra plataforma segura. Tu cuenta quedará
                pendiente de aprobación por nuestro equipo (normalmente en 24h).
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-800">
              <p className="font-semibold mb-1">¿Qué incluye la cuenta B2B?</p>
              <ul className="space-y-1 text-blue-700">
                <li>✓ Precios mayorista exclusivos</li>
                <li>✓ Acceso a catálogo completo (2.118 productos)</li>
                <li>✓ Pedidos con pago por transferencia</li>
                <li>✓ Historial de pedidos</li>
              </ul>
            </div>

            <a
              href={`${WP_SITE}/mi-cuenta/?action=register`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 mb-4"
            >
              <ExternalLink size={16} />
              Crear cuenta en GSMGC.ES
            </a>

            <p className="text-xs text-gray-400 text-center mb-6">
              Se abrirá el formulario oficial en una nueva pestaña
            </p>

            <div className="text-center">
              <button
                onClick={() => setMode('login')}
                className="text-sm text-gray-500 hover:text-[#2563eb] transition"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </div>
          </div>
        ) : mode === 'pending' ? (
          /* ── Pending approval panel ── */
          <div className="bg-white rounded-2xl border border-[#2563eb]/30 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="text-[#2563eb]" size={30} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Cuenta en revisión</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Tu registro se ha recibido correctamente. Nuestro equipo está verificando tu solicitud de cuenta B2B.
              </p>
            </div>

            {/* Estimated time card */}
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
              <p className="text-xs text-gray-500 mt-2 pl-13 ml-13">
                Las solicitudes se procesan de L a V entre 9:00 y 18:00 (hora Canarias)
              </p>
            </div>

            {/* Required documents list */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} className="text-[#1e3a8a]" />
                <p className="font-semibold text-gray-800 text-sm">Documentación necesaria para la aprobación</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  { label: 'CIF / NIF válido', desc: 'Identificación fiscal de la empresa o autónomo' },
                  { label: 'Nombre de empresa / Actividad comercial', desc: 'Razón social o nombre del negocio' },
                  { label: 'Dirección fiscal en Canarias', desc: 'Dirección completa en Gran Canaria o Tenerife' },
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

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/34688560560?text=Hola%2C%20he%20registrado%20mi%20cuenta%20B2B%20en%20GSMGC%20y%20quer%C3%ADa%20acelerar%20la%20revisi%C3%B3n.%20Gracias."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 mb-4"
            >
              <MessageCircle size={18} />
              Acelerar revisión por WhatsApp
            </a>

            <p className="text-xs text-gray-400 text-center mb-5">
              Abre WhatsApp con un mensaje predispuesto para agilizar tu aprobación
            </p>

            {/* Back to login */}
            <div className="border-t border-gray-100 pt-4 text-center">
              <button
                onClick={() => setMode('login')}
                className="text-sm text-gray-500 hover:text-[#2563eb] transition font-medium"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        ) : (
          /* ── Login panel ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-800">
              <p className="font-semibold mb-1">Acceso de clientes B2B</p>
              <p>El inicio de sesión te lleva directamente a tu área de cliente en gsmgc.es, donde podrás ver tus pedidos y datos.</p>
            </div>

            <a
              href={`${WP_SITE}/mi-cuenta/`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 mb-4"
            >
              <ExternalLink size={16} />
              Ir a mi cuenta (gsmgc.es)
            </a>

            <p className="text-xs text-gray-400 text-center mb-6">
              Se abrirá tu área de cliente en una nueva pestaña
            </p>

            <div className="border-t border-gray-100 pt-5 mt-5">
              <p className="text-sm text-gray-500 text-center mb-3">¿Olvidaste tu contraseña?</p>
              <a
                href={`${WP_SITE}/mi-cuenta/lost-password/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border border-gray-200 hover:bg-gray-50 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm text-gray-700"
              >
                Recuperar contraseña
              </a>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => setMode('register')}
                className="text-sm text-gray-500 hover:text-[#2563eb] transition"
              >
                ¿No tienes cuenta? Regístrate
              </button>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="text-center mt-6 text-sm text-gray-500">
          ¿Problemas con el acceso? Contacta por{' '}
          <a href="https://wa.me/34688560560" className="text-[#2563eb] font-semibold hover:underline">
            WhatsApp
          </a>{' '}
          o email{' '}
          <span className="text-[#2563eb] font-semibold">info@gsmgc.es</span>
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
