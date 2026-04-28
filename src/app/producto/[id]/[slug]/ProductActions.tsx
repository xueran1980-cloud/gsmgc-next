'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface ProductActionsProps {
  product: {
    id: number;
    name: string;
    sku: string;
    price: string;
    stock_quantity: number | null;
    stock_status: string;
    images: Array<{ src: string }>;
    min_qty: number;
  };
}

export default function ProductActions({ product }: ProductActionsProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(product.min_qty || 1);

  const inStock = product.stock_status === 'instock';
  const stock = product.stock_quantity || 0;
  const minQty = product.min_qty || 1;
  const image = product.images?.[0]?.src;

  if (!inStock) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed">
        Sin stock
      </div>
    );
  }

  function handleAdd() {
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock,
      image,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(minQty, q - 1))}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition"
            type="button"
          >
            <Minus size={16} className="text-gray-500" />
          </button>
          <span className="w-12 text-center font-bold text-sm">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition"
            type="button"
          >
            <Plus size={16} className="text-gray-500" />
          </button>
        </div>
        {stock > 0 && (
          <span className="text-xs text-gray-400">{stock} disponibles</span>
        )}
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        disabled={added}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 ${
          added
            ? 'bg-green-500 text-white'
            : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:bg-[#1e40af]'
        }`}
      >
        {added ? (
          <>
            <Check size={18} />
            Agregado al carrito
          </>
        ) : (
          <>
            <ShoppingCart size={18} />
            Agregar al carrito — €{(parseFloat(product.price || '0') * qty).toFixed(2)}
          </>
        )}
      </button>
    </div>
  );
}
