'use client';

import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, removeItem, updateQty, clearCart } = useCart();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#2563eb]" />
            <h2 className="font-bold text-lg">Carrito</h2>
            <span className="bg-[#2563eb] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
              <Link
                href="/tienda"
                onClick={onClose}
                className="inline-block bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1d4ed8] transition"
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 rounded-xl">
                  {/* Image */}
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-2xl">📱</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
                      {item.name}
                    </h4>
                    {item.sku && (
                      <div className="text-xs text-gray-400 mb-1">SKU: {item.sku}</div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[#2563eb] font-black text-sm">
                          €{(parseFloat(item.price || '0') * item.qty).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">
                          €{parseFloat(item.price || '0').toFixed(2)}/ud
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-300 hover:text-red-500 transition self-start p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm">Subtotal</span>
              <span className="font-black text-xl text-gray-900">€{totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">IVA/IGIC y envío calculado al finalizar</p>
            <div className="space-y-2">
              <Link
                href="/checkout"
                onClick={onClose}
                className="block text-center bg-[#2563eb] text-white font-bold py-3 rounded-xl hover:bg-[#1d4ed8] transition"
              >
                Finalizar pedido
              </Link>
              <button
                onClick={clearCart}
                className="block w-full text-center text-sm text-gray-400 hover:text-red-500 transition py-1"
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
