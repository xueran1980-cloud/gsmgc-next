'use client';

import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, X } from 'lucide-react';
import type { ProductImage } from '@/lib/api';
import { resolveImageUrl } from '@/lib/image';

interface ImageGalleryProps {
  images: ProductImage[];
  productName: string;
  hasDiscount: boolean;
  discountPct: number;
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
        style={{ imageRendering: 'auto' }}
      />
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl bg-black/40 rounded-full w-10 h-10 flex items-center justify-center transition"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Cerrar"
      >
        <X size={24} />
      </button>
    </div>
  );
}

export default function ImageGallery({ images, productName, hasDiscount, discountPct }: ImageGalleryProps) {
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Reset when images change
  useEffect(() => {
    setActiveImg(0);
    setLightbox(false);
  }, [productName]);

  const openLightbox = useCallback(() => {
    if (images[activeImg]?.src) setLightbox(true);
  }, [images, activeImg]);

  if (!images || images.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="aspect-square flex items-center justify-center">
          <div className="text-center text-gray-300">
            <svg className="w-20 h-20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-sm">Sin imagen</span>
          </div>
        </div>
      </div>
    );
  }

  const currentSrc = resolveImageUrl(images[activeImg]?.src) || '';

  return (
    <>
      {/* Lightbox */}
      {lightbox && currentSrc && (
        <Lightbox src={currentSrc} alt={productName} onClose={() => setLightbox(false)} />
      )}

      {/* Main image */}
      <div
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 relative group cursor-zoom-in"
        onClick={openLightbox}
      >
        <div className="aspect-square flex items-center justify-center p-8">
          <img
            src={currentSrc}
            alt={productName}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        {currentSrc && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition">
            <ZoomIn size={16} />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-[#ea580c] text-white text-sm font-black px-3 py-1 rounded-xl shadow-lg">
            -{discountPct}%
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id || i}
              onClick={() => setActiveImg(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition bg-white ${
                i === activeImg
                  ? 'border-[#2563eb] shadow-md'
                  : 'border-gray-100 hover:border-gray-300'
              }`}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <img
                src={img.src}
                alt={`${productName} - imagen ${i + 1}`}
                className="w-full h-full object-contain p-1"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
