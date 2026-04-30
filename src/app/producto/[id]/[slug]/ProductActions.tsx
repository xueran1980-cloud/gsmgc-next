'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
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
  };
}

export default function ProductActions({ product }: ProductActionsProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const inStock = product.stock_status === 'instock';
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
      image,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 mb-5">
      {/* Quantity selector */}
      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-11 h-12 text-gray-600 hover:bg-gray-50 transition text-lg font-bold flex items-center justify-center"
          type="button"
        >
          −
        </button>
        <input
          type="number"
          value={qty}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-14 text-center font-black text-lg border-x border-gray-100 h-12 focus:outline-none"
          min={1}
        />
        <button
          onClick={() => setQty((q) => q + 1)}
          className="w-11 h-12 text-gray-600 hover:bg-gray-50 transition text-lg font-bold flex items-center justify-center"
          type="button"
        >
          +
        </button>
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        disabled={added}
        className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition text-base ${
          added
            ? 'bg-green-500 text-white'
            : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {added ? (
          <>
            <Check size={18} />
            Añadido al carrito
          </>
        ) : (
          <>
            <ShoppingCart size={18} />
            Añadir al carrito
          </>
        )}
      </button>
    </div>
  );
}
