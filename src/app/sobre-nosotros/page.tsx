"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone, Mail, MapPin, Clock, ShieldCheck, Truck,
  CheckCircle2, MessageCircle, Send, Building2, Users, Award,
  Star, Package, Headphones, ChevronRight, Globe, Zap,
} from "lucide-react";

function PageHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon: React.ElementType }) {
  return (
    <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }}
      />
      <div className="max-w-7xl mx-auto px-4 relative">
        {Icon && (
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Icon size={24} className="text-white" />
          </div>
        )}
        <h1 className="text-4xl font-black mb-2">{title}</h1>
        {subtitle && <p className="text-blue-100 text-lg">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function SobreNosotrosPage() {
  const stats = [
    { value: "2,100+", label: "Referencias en catálogo", icon: Package },
    { value: "24h", label: "Entrega en Canarias", icon: Truck },
    { value: "6 meses", label: "Garantía en productos", icon: ShieldCheck },
    { value: "10+ años", label: "Experiencia en el sector", icon: Award },
  ];

  const values = [
    { icon: Zap, title: "Rapidez", desc: "Pedidos confirmados antes de las 14h salen el mismo día. Entrega en 24h a Gran Canaria y Tenerife." },
    { icon: ShieldCheck, title: "Calidad garantizada", desc: "Todos los productos pasan control de calidad. Garantía de 6 meses en toda la mercancía." },
    { icon: Package, title: "Amplio catálogo", desc: "Más de 2,100 referencias de repuestos, fundas, cables, cargadores y accesorios para todas las marcas." },
    { icon: Headphones, title: "Soporte real", desc: "Atención directa por WhatsApp y teléfono. Sin bots, sin esperas, con conocimiento técnico real." },
    { icon: Globe, title: "Solo Canarias", desc: "Especializados en las islas. Conocemos tus necesidades, tu fiscalidad (IGIC) y tus tiempos." },
    { icon: Users, title: "Solo B2B", desc: "Trabajamos exclusivamente con profesionales: talleres, tiendas y distribuidores registrados." },
  ];

  const timeline = [
    { year: "2014", text: "Inicio de actividad como distribuidor de repuestos en Las Palmas de Gran Canaria." },
    { year: "2017", text: "Expansión del catálogo a fundas, accesorios y periféricos para todas las marcas principales." },
    { year: "2020", text: "Digitalización del proceso de pedidos. Primero en Canarias en ofrecer catálogo online para mayoristas." },
    { year: "2024", text: "Más de 2,100 referencias y cobertura a todas las islas en 24 horas." },
    { year: "2025", text: "Lanzamiento de la nueva plataforma B2B gsmgc.es para pedidos online 24/7." },
  ];

  return (
    <>
      <PageHeader
        title="Sobre GSMGC"
        subtitle="Tu distribuidor mayorista de confianza en Canarias desde 2014"
        icon={Building2}
      />

      {/* Stats bar */}
      <div className="bg-[#1e3a8a] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={22} className="text-blue-300 mx-auto mb-2" />
              <div className="text-2xl font-black text-white mb-1">{value}</div>
              <div className="text-blue-300 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <span className="text-[#2563eb] font-bold text-sm uppercase tracking-wider">Nuestra historia</span>
            <h2 className="text-3xl font-black text-gray-900 mt-2 mb-4">
              Nacidos en Canarias,<br />para los profesionales de Canarias
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              GSMGC nació en Las Palmas de Gran Canaria con una misión clara: ofrecer a talleres y tiendas
              de telefonía un proveedor local fiable, con precios competitivos y entrega rápida en las islas.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Entendemos las particularidades del mercado canario: fiscalidad IGIC, logística insular,
              y la necesidad de reponerse rápido. Por eso trabajamos solo con profesionales y solo en Canarias.
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 bg-[#2563eb] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1d4ed8] transition"
            >
              Contactar ahora <ChevronRight size={16} />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#2563eb] rounded-xl flex items-center justify-center">
                <span className="text-white font-black">GS</span>
              </div>
              <div>
                <div className="font-black text-gray-900">GSMGC</div>
                <div className="text-xs text-gray-500">Accesorios Móvil Canarias</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Distribuidor autorizado de las principales marcas",
                "Control de stock en tiempo real",
                "Facturas con desglose IGIC",
                "Envío a todas las islas",
                "Atención en español, rápida y técnica",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#2563eb] mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Nuestro recorrido</h2>
          <div className="relative">
            <div className="absolute left-[11px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 md:-translate-x-0.5" />
            <div className="space-y-8">
              {timeline.map((item, i) => (
                <div key={item.year} className={`relative flex gap-6 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  <div className={`md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"} pl-10 md:pl-0`}>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
                      <div className="font-black text-[#2563eb] text-lg mb-1">{item.year}</div>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-6 h-6 bg-[#2563eb] rounded-full border-4 border-white shadow flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="hidden md:block md:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Values grid */}
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">Por qué elegir GSMGC</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-5 hover:shadow-md transition">
                <div className="w-11 h-11 bg-[#2563eb]/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-[#2563eb]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-4">¿Listo para empezar?</h2>
          <p className="text-blue-100 mb-8">
            Regístrate como distribuidor y accede a nuestro catálogo completo con precios mayoristas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mi-cuenta?register=1"
              className="bg-white text-[#2563eb] font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition"
            >
              Solicitar cuenta
            </Link>
            <Link
              href="/contacto"
              className="bg-white/20 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/30 transition border border-white/30"
            >
              Hablar con nosotros
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
