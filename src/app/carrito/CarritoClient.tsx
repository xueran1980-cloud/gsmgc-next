'use client';

import { Plus, Minus, Trash2, ShoppingBag, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CarritoClient() {
  const { items, totalItems, totalPrice, removeItem, updateQty, clearCart } = useCart();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag size={28} className="text-[#2563eb]" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900">Tu carrito</h1>
            {totalItems > 0 && (
              <p className="text-gray-500 text-sm mt-0.5">
                {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
              </p>
            )}
          </div>
        </div>

        {/* MOQ Warning */}
        {items.length > 0 && totalItems < 5 && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck size={20} className="text-[#ea580c] shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-800 font-bold text-sm">
                Pedido mínimo recomendado: 5 unidades
              </p>
              <p className="text-orange-600 text-xs mt-0.5">
                Añade {5 - totalItems} más para mejor precio de envío
              </p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Explora nuestro catálogo con más de 2.000 productos al mayor y añade los que necesites.
            </p>
            <Link
              href="/tienda"
              className="inline-block bg-[#2563eb] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#1d4ed8] transition shadow-lg shadow-blue-200"
            >
              Ver catálogo completo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-5 md:p-6">
                  {/* Image */}
                  <div className="w-24 h-24 md:w-28 md:h-28 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl">📱</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        {item.sku && (
                          <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          Precio unitario: <span className="font-semibold text-gray-700">€{parseFloat(item.price || '0').toFixed(2)}</span>
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-300 hover:text-red-500 transition p-1 shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Footer row: qty + price */}
                    <div className="flex items-center justify-between mt-4">
                      {/* Qty controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center font-bold text-lg">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Line total */}
                      <div className="text-right">
                        <div className="text-[#2563eb] font-black text-lg">
                          €{(parseFloat(item.price || '0') * item.qty).toFixed(2)}
                        </div>
                        {item.qty > 1 && (
                          <div className="text-xs text-gray-400">
                            €{parseFloat(item.price || '0').toFixed(2)} × {item.qty}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary + Actions */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
              {/* Summary */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 text-base">Subtotal ({totalItems} artículos)</span>
                <span className="font-black text-2xl text-gray-900">€{totalPrice.toFixed(2)}</span>
              </div>

              <p className="text-xs text-gray-400 mb-6">
                IVA/IGIC (7%) y gastos de envío se calculan al finalizar el pedido.
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  href="/checkout"
                  className="block text-center bg-[#2563eb] text-white font-black py-4 rounded-xl hover:bg-[#1d4ed8] transition shadow-lg shadow-blue-200 text-base"
                >
                  Finalizar pedido
                </Link>

                <div className="flex items-center gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 text-sm text-gray-400 hover:text-red-500 transition py-2"
                  >
                    Vaciar carrito
                  </button>
                  <Link
                    href="/tienda"
                    className="flex-1 flex items-center justify-center gap-2 text-sm text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition py-2"
                  >
                    <ArrowLeft size={14} />
                    Continuar comprando
                  </Link>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl mb-1">🚚</div>
                  <p className="text-xs text-gray-500">Envío 24h</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">🛡️</div>
                  <p className="text-xs text-gray-500">Garantía 6 meses</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">↩️</div>
                  <p className="text-xs text-gray-500">Devoluciones</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
