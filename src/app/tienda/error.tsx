'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function TiendaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[tienda] error.tsx caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">{'⚠️'}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Algo salio mal</h2>
        <p className="text-gray-500 mb-2">Error al cargar la tienda</p>
        {error?.message && (
          <p className="text-sm text-red-500 mb-6 font-mono max-w-md mx-auto break-words">
            {error.message}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Reintentar
          </button>
          <Link href="/" className="text-blue-600 underline py-3 hover:text-blue-800">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
