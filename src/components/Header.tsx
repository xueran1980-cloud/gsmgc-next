import Link from "next/link";
import { Phone, Smartphone, Search } from "lucide-react";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/tienda" },
  { label: "Nosotros", href: "/sobre-nosotros" },
  { label: "Contacto", href: "/contacto" },
];

export default function Header() {
  return (
    <>
      {/* Top bar */}
      <div className="bg-[#1e3a8a] text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span className="hidden sm:flex items-center gap-1.5">
            <Phone size={13} />
            <a href="tel:+34688560560" className="hover:text-blue-200 transition">688 560 560</a>
          </span>
          <span className="hidden md:block text-xs text-blue-200">
            🇮🇨 Envío en 24h a Canarias · Garantía 6 meses · Solo mayoristas
          </span>
          <Link
            href="/mi-cuenta?register=1"
            className="bg-[#ea580c] hover:bg-orange-500 px-3 py-0.5 rounded text-white text-xs font-bold transition"
          >
            Solicitar cuenta
          </Link>
        </div>
      </div>

      {/* Main header */}
      <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition">
              <span className="text-white font-black text-sm">GS</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[#1e3a8a] font-black text-lg leading-none tracking-tight">GSMGC</div>
              <div className="text-[10px] text-gray-400 leading-none mt-0.5 font-medium">Accesorios Móvil</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-4">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-[#2563eb] hover:bg-blue-50 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search placeholder */}
          <div className="flex-1 hidden md:block max-w-xs xl:max-w-sm ml-auto">
            <Link
              href="/tienda"
              className="flex items-center gap-2 border border-gray-200 rounded-xl pl-4 pr-4 py-2.5 text-sm text-gray-400 hover:border-[#2563eb] transition bg-gray-50"
            >
              <Search size={15} />
              <span>Buscar producto...</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <Link
            href="/tienda"
            className="lg:hidden p-2 text-gray-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition"
            aria-label="Menú"
          >
            <Smartphone size={21} />
          </Link>
        </div>
      </header>
    </>
  );
}
