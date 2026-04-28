import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones de Venta B2B - GSMGC Mayorista Canarias",
  description: "Condiciones generales de venta para distribuidores mayoristas. Términos B2B, pagos, envíos y garantías en Canarias.",
  alternates: { canonical: "https://gsmgc.es/condiciones-de-venta" },
};

export default function CondicionesPage() {
  return (
    <>
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <h1 className="text-4xl font-black mb-2">Condiciones Generales de Venta B2B</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16 prose prose-gray max-w-none text-sm text-gray-600 leading-relaxed">
        <p><strong>Última actualización:</strong> Enero 2025</p>
        <h2>1. Objeto</h2>
        <p>Las presentes Condiciones Generales de Venta regulan la relación comercial entre <strong>GSMGC</strong> (YOU MOBILE CANARIAS SL, C/ Mayor 45, 35001 Las Palmas de Gran Canaria) y los clientes profesionales registrados en la plataforma gsmgc.es.</p>
        <h2>2. Registro y acceso</h2>
        <p>El acceso a precios mayoristas está reservado exclusivamente a profesionales del sector. GSMGC se reserva el derecho de aprobar o denegar solicitudes de registro.</p>
        <h2>3. Precios</h2>
        <p>Los precios publicados son precios mayoristas sin IVA/IGIC. Se aplicará IGIC 7% en la factura final. Los precios pueden ser modificados sin previo aviso.</p>
        <h2>4. Pedidos</h2>
        <p>Los pedidos tienen carácter vinculante una vez confirmados. GSMGC confirmará disponibilidad y plazo de entrega.</p>
        <h2>5. Pagos</h2>
        <p><strong>Transferencia bancaria:</strong> El pedido se prepara una vez recibido el pago.</p>
        <p><strong>Contra reembolso:</strong> Disponible en Gran Canaria y Tenerife. Recargo del 2%.</p>
        <h2>6. Envíos</h2>
        <p>Envío a todas las islas Canarias en 24h laborables para pedidos antes de las 14:00h.</p>
        <h2>7. Garantía</h2>
        <p>Garantía de 6 meses contra defectos de fabricación. Cubre reparación o sustitución.</p>
        <h2>8. Devoluciones</h2>
        <p>Plazo máximo de 14 días desde la recepción. Producto en embalaje original y sin signos de uso.</p>
      </div>
    </>
  );
}
