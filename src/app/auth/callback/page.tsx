'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, authCheck } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const token = searchParams.get('token');
      const redirect = searchParams.get('redirect') || '/';

      if (!token) {
        setStatus('error');
        setErrorMsg('Token no recibido. Intenta iniciar sesión de nuevo.');
        return;
      }

      try {
        // 1. Store token in localStorage
        setToken(token);

        // 2. Verify token via API and get user info
        await authCheck();

        // 3. Update AuthContext so entire app knows user is logged in
        await refreshUser();

        setStatus('success');

        // 4. Redirect after brief success display
        setTimeout(() => {
          router.push(redirect);
        }, 1200);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Error al verificar la sesión');
      }
    }

    handleCallback();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin text-[#2563eb] mx-auto mb-4" size={40} />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Verificando sesión...</h2>
            <p className="text-sm text-gray-500">Estableciendo tu conexión segura</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="text-green-500 mx-auto mb-4" size={40} />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Sesión activada</h2>
            <p className="text-sm text-gray-500">Redirigiendo...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="text-red-500 mx-auto mb-4" size={40} />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Error de autenticación</h2>
            <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
            <a
              href="/mi-cuenta"
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-6 py-2.5 rounded-xl transition text-sm"
            >
              Iniciar sesión
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
