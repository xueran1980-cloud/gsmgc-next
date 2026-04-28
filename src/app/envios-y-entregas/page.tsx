import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Envíos y Entregas - GSMGC Canarias",
  description: "Política de envíos y entregas a Gran Canaria, Tenerife y todas las islas. Tiempos de entrega y condiciones.",
  alternates: { canonical: "https://gsmgc.es/envios-y-entregas" },
};

export default function EnviosPage() {
  return (
    <>
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <h1 className="text-4xl font-black mb-2">Política de Envío y Entregas</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16 prose prose-gray max-w-none text-sm text-gray-600 leading-relaxed">
        <p><strong>Última actualización:</strong> Enero 2025</p>
        <h2>Zonas de envío</h2>
        <p>GSMGC realiza envíos a todas las Islas Canarias: Gran Canaria, Tenerife, Lanzarote, Fuerteventura, La Palma, La Gomera y El Hierro.</p>
        <h2>Plazos de entrega</h2>
        <ul>
          <li><strong>Gran Canaria:</strong> 24h laborables (pedidos antes de las 14:00h)</li>
          <li><strong>Tenerife:</strong> 24-48h laborables</li>
          <li><strong>Resto de islas:</strong> 48-72h laborables</li>
        </ul>
        <h2>Gastos de envío</h2>
        <p>Calculados automáticamente según destino y peso. Se muestran antes de confirmar el pedido.</p>
        <h2>Recogida en local</h2>
        <p>Posible en nuestro almacén en Las Palmas de Gran Canaria, previa coordinación por WhatsApp o teléfono.</p>
      </div>
    </>
  );
}
