import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carrito | GSMGC Canarias - Accesorios Móviles al Mayor',
  description: 'Revisa tu carrito de compras. Más de 2.000 productos de accesorios móviles al mayor. Envío 24h a Canarias.',
  robots: {
    index: false,
    follow: false,
  },
};

export { default } from './CarritoClient';
