"use client";

import Link from "next/link";
import { ShieldCheck, Truck, MapPin, Clock, ArrowRight, Star, UserPlus } from "lucide-react";
import type { Product } from "@/lib/api";
import { getProductImage } from "@/lib/api";

const HERO_STATS = [
  { value: "2118", label: "Productos" },
  { value: "30", label: "Categorías" },
  { value: "24h", label: "Envío GC" },
  { value: "6m", label: "Garantía" },
];

const TRUST_ITEMS = [
  { icon: Truck, text: "Envío en 24h a Canarias" },
  { icon: ShieldCheck, text: "Garantía de 6 meses" },
  { icon: MapPin, text: "Recogida en local" },
  { icon: Clock, text: "Soporte L-V 10:00-14:00" },
];

const HOT_CATS = ["iPhone", "Samsung", "Xiaomi", "Cables", "Baterías"];

export default function Hero({ featuredProducts }: { featuredProducts: Product[] }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#2563eb]">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-[#ea580c]/15 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-bold px-3.5 py-1.5 rounded-full mb-6">
              <UserPlus size={14} />
              Solo para profesionales · Registro gratuito
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.1] mb-5">
              Repuestos<br />
              <span className="text-[#60a5fa]">para Móviles</span><br />
              al Por Mayor
            </h1>

            <p className="text-blue-100 text-lg mb-6 max-w-md leading-relaxed">
              Distribuidor mayorista de accesorios y repuestos en Canarias.
              +2.100 referencias, precios competitivos, envío en 24h.
            </p>

            {/* Hot category chips */}
            <div className="flex flex-wrap gap-2 mb-8">
              {HOT_CATS.map(cat => (
                <Link
                  key={cat}
                  href={`/tienda?search=${encodeURIComponent(cat)}`}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm transition"
                >
                  {cat}
                </Link>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/mi-cuenta?register=1"
                className="bg-[#ea580c] text-white font-black px-7 py-3.5 rounded-xl hover:bg-[#c24a0a] transition shadow-xl shadow-orange-500/30 flex items-center gap-2 text-sm"
              >
                Registrarse como profesional
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/tienda"
                className="border-2 border-white/40 hover:border-white/70 text-white font-bold px-7 py-3.5 rounded-xl hover:bg-white/15 transition text-sm flex items-center gap-2"
              >
                Ver Catálogo
              </Link>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2.5">
              {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-blue-200 text-xs">
                  <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={12} className="text-blue-300" />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Cards */}
          <div className="relative hidden md:block">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {HERO_STATS.map(({ value, label }) => (
                  <div key={label} className="text-center p-3 bg-white/10 rounded-xl">
                    <div className="text-xl font-black text-white">{value}</div>
                    <div className="text-blue-300 text-[10px] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Product cards */}
              <div className="flex gap-3">
                {featuredProducts.length > 0
                  ? featuredProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/producto/${p.id}/${p.slug}`}
                      className="flex-1 bg-white rounded-2xl p-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="bg-gray-50 rounded-xl h-20 mb-2 flex items-center justify-center overflow-hidden">
                        <img
                          src={getProductImage(p)}
                          alt={`${p.name} | GSMGC Accesorios Móvil Canarias`}
                          className="max-h-16 max-w-full object-contain group-hover:scale-105 transition-transform"
                          loading="eager"
                          decoding="async"
                          fetchPriority="high"
                          width={120}
                          height={120}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-2 mb-1">{p.name}</div>
                      <div className="text-[10px] font-bold text-[#2563eb]">
                        €{parseFloat(p.price || "0").toFixed(2)}
                        {p.regular_price && parseFloat(p.regular_price) > parseFloat(p.price) && (
                          <span className="text-[9px] text-gray-400 line-through ml-1">
                            €{parseFloat(p.regular_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                  : ["PANTALLA IPHONE 14", "BATERÍA SAM A55", "CABLE USB-C"].map((name, i) => (
                    <div key={i} className="flex-1 bg-white rounded-2xl p-3 shadow-lg">
                      <div className="bg-gray-100 rounded-xl h-20 mb-2 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                      </div>
                      <div className="text-[10px] font-bold text-gray-700 leading-tight mb-1">{name}</div>
                      <div className="text-[#2563eb] font-black text-sm">€{(12 + i * 6).toFixed(2)}</div>
                    </div>
                  ))
                }
              </div>

              {/* Real stats bar */}
              <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-white text-xs font-semibold">2118+ productos</span>
                </div>
                <span className="text-blue-300 text-xs">30 categorías · 24h Canarias</span>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-[#ea580c] text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg rotate-3">
              ¡Mayorista!
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
          <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
