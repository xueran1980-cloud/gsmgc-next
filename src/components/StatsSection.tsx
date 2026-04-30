import Link from "next/link";
import { Package, Users, Zap, Percent, ShieldCheck, Truck, RotateCcw, HeadphonesIcon, BadgeCheck, Clock } from "lucide-react";

const STATS = [
  { value: "2.077", label: "Referencias", icon: Package, color: "text-blue-400" },
  { value: "500+", label: "Clientes B2B", icon: Users, color: "text-green-400" },
  { value: "24h", label: "Envío a GC/TF", icon: Zap, color: "text-yellow-400" },
  { value: "7%", label: "IGIC Canarias", icon: Percent, color: "text-orange-400" },
];

const B2B_BENEFITS = [
  { icon: BadgeCheck, title: "Precios Mayorista", description: "Tarifas exclusivas para profesionales. Descuentos por volumen bajo petición.", color: "bg-blue-500" },
  { icon: Truck, title: "Envío en 24h", description: "Entrega rápida a Gran Canaria y Tenerife. Recogida gratuita en nuestro local.", color: "bg-green-500" },
  { icon: ShieldCheck, title: "Garantía 6 Meses", description: "Todos los productos con garantía de 6 meses. Sin complicaciones.", color: "bg-purple-500" },
  { icon: RotateCcw, title: "Devoluciones Fáciles", description: "Política de devoluciones flexible. Proceso simple y sin burocracia.", color: "bg-orange-500" },
  { icon: HeadphonesIcon, title: "Soporte Dedicado", description: "Atención personalizada por WhatsApp y teléfono en horario comercial.", color: "bg-pink-500" },
  { icon: Clock, title: "Stock Siempre Disponible", description: "+2.100 referencias en stock permanente. Actualizamos catálogo semanalmente.", color: "bg-cyan-500" },
];

export default function StatsSection() {
  return (
    <>
      {/* Stats bar */}
      <section className="py-16 bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#2563eb] text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {STATS.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-3 group-hover:bg-white/20 transition">
                  <Icon size={26} className={color} />
                </div>
                <div className="text-4xl font-black tracking-tight">{value}</div>
                <div className="text-blue-300 text-sm mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-blue-200 text-sm mb-5">¿Eres profesional del sector? Únete a nuestra red de distribuidores.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/tienda"
                className="bg-white text-[#1e3a8a] font-black px-8 py-4 rounded-xl hover:bg-blue-50 transition shadow-lg shadow-white/10 text-sm"
              >
                Ver catálogo completo
              </Link>
              <a
                href="https://api.gsmgc.es/mi-cuenta/?action=register"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-white/30 hover:border-white/60 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition text-sm"
              >
                Crear cuenta B2B gratis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* B2B benefits grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-[#2563eb]/10 text-[#2563eb] text-xs font-bold px-4 py-1.5 rounded-full mb-4">
              <BadgeCheck size={14} />
              Por qué elegirnos
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">La plataforma B2B para profesionales</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              Llevamos años sirviendo a talleres de reparación, tiendas de móviles y distribuidores en Canarias.
              Conocemos tus necesidades.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {B2B_BENEFITS.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="group flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-[#2563eb]/30 hover:shadow-lg transition-all duration-200 bg-white">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 mb-1 text-sm">{title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] rounded-3xl p-8 text-center text-white">
            <h3 className="text-2xl font-black mb-2">¿Listo para empezar?</h3>
            <p className="text-blue-200 text-sm mb-6">Regístrate gratis y empieza a comprar al precio mayorista hoy mismo.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://api.gsmgc.es/mi-cuenta/?action=register"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#1e3a8a] font-black px-7 py-3 rounded-xl hover:bg-blue-50 transition shadow-lg text-sm"
              >
                Crear cuenta gratis
              </a>
              <a
                href="https://wa.me/34688560560"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-white/30 text-white font-bold px-7 py-3 rounded-xl hover:bg-white/10 transition text-sm"
              >
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
