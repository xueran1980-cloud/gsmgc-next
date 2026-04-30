'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface AddToCartButtonProps {
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

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const inStock = product.stock_status === 'instock';
  const image = product.images?.[0]?.src;

  if (!inStock) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm cursor-not-allowed"
      >
        Sin stock
      </button>
    );
  }

  function handleAdd() {
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
        added
          ? 'bg-green-500 text-white'
          : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:bg-[#1e40af]'
      }`}
    >
      {added ? (
        <>
          <Check size={16} />
          Agregado
        </>
      ) : (
        <>
          <ShoppingCart size={16} />
          Agregar
        </>
      )}
    </button>
  );
}
