import Link from "next/link";
import { Phone, Mail, MapPin, Clock, Truck, ShieldCheck } from "lucide-react";

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Tienda: [
    { label: "Inicio", href: "/" },
    { label: "Catálogo", href: "/tienda" },
    { label: "Marcas", href: "/tienda?sort=brand" },
    { label: "Novedades", href: "/tienda?orderby=date" },
  ],
  Legal: [
    { label: "Condiciones de venta", href: "/condiciones-de-venta" },
    { label: "Política de privacidad", href: "/politica-de-privacidad" },
    { label: "Envíos y entregas", href: "/envios-y-entregas" },
    { label: "Devoluciones", href: "/devoluciones" },
  ],
  Cuenta: [
    { label: "Iniciar sesión", href: "https://gsmgc.es/mi-cuenta/" },
    { label: "Registrarse", href: "https://gsmgc.es/mi-cuenta/?action=register" },
    { label: "Recuperar contraseña", href: "https://gsmgc.es/mi-cuenta/lost-password/" },
  ],
};

const TRUST = [
  { icon: Truck, text: "Envío en 24h a Canarias" },
  { icon: ShieldCheck, text: "Garantía de 6 meses" },
  { icon: MapPin, text: "Recogida en local" },
];

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] text-gray-300">
      {/* Trust bar */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TRUST.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm">
              <Icon size={16} className="text-blue-400 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#2563eb] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">GS</span>
              </div>
              <div>
                <div className="text-white font-black text-lg">GSMGC</div>
                <div className="text-gray-500 text-[10px]">Accesorios Móvil Canarias</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Distribuidor mayorista de accesorios y repuestos para móviles.
              Las mejores marcas, precios competitivos, servicio rápido en Canarias.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-blue-400" />
                <a href="tel:+34688560560" className="hover:text-white transition">688 560 560</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-blue-400" />
                <a href="mailto:gsmyoucanarias@gmail.com" className="hover:text-white transition">gsmyoucanarias@gmail.com</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-400" />
                <span>Las Palmas de GC, Canarias</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-400" />
                <span>L-V 9:00-18:00</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <a
                  href="https://wa.me/34688560560"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  className="w-8 h-8 bg-[#25D366] hover:bg-[#128C7E] rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-bold text-sm mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith('https://') ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-white transition"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-white transition"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>&copy; 2026 GSMGC Accesorios Móvil. Todos los derechos reservados.</span>
          <span>Las Palmas de Gran Canaria, Canarias, España</span>
        </div>
      </div>
    </footer>
  );
}
