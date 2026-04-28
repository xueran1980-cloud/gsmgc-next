"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ShoppingBag, Phone, ArrowLeft, Search, MessageCircle } from "lucide-react";
import { useState } from "react";

const QUICK_LINKS = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Catálogo", href: "/tienda", icon: ShoppingBag },
  { label: "Contacto", href: "/contacto", icon: Phone },
];

export default function NotFoundPage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/tienda?search=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-lg w-full text-center">
        {/* Big 404 */}
        <div className="relative mb-8 select-none">
          <div className="text-[160px] font-black leading-none text-gray-100">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-[#2563eb] rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-300 rotate-6">
              <Search size={40} className="text-white -rotate-6" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-3">Página no encontrada</h1>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          Lo sentimos, la página que buscas no existe o ha sido movida.<br />
          Prueba a buscar el producto que necesitas:
        </p>

        {/* Search box */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-sm mx-auto">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto, marca..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
            />
          </div>
          <button
            type="submit"
            className="bg-[#2563eb] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#1d4ed8] transition text-sm"
          >
            Buscar
          </button>
        </form>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:border-[#2563eb] hover:text-[#2563eb] transition shadow-sm text-sm"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        {/* WhatsApp button */}
        <a
          href="https://wa.me/34688560560?text=Hola%2C%20estoy%20buscando%20un%20producto%20en%20vuestra%20tienda"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25d366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#20bd5a] transition shadow-lg mb-8 text-sm justify-center"
        >
          <MessageCircle size={18} />
          Contactar por WhatsApp
        </a>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-700 text-sm flex items-center gap-1.5 mx-auto transition"
        >
          <ArrowLeft size={14} /> Volver atrás
        </button>
      </div>
    </div>
  );
}
