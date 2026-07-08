'use client';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Producto no disponible temporalmente
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        No se ha podido cargar la informacion de este producto.
        Por favor, intentalo de nuevo en unos instantes.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1d4ed8] transition"
        >
          Reintentar
        </button>
        <a
          href="/tienda"
          className="border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:border-[#2563eb] transition"
        >
          Volver a la tienda
        </a>
      </div>
    </div>
  );
}
