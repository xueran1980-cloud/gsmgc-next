import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devoluciones y Garantías - GSMGC",
  description: "Política de devoluciones y garantías para distribuidores. Plazos, condiciones y procedimiento.",
  alternates: { canonical: "https://gsmgc.es/devoluciones" },
};

export default function DevolucionesPage() {
  return (
    <>
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <h1 className="text-4xl font-black mb-2">Política de Devoluciones</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16 prose prose-gray max-w-none text-sm text-gray-600 leading-relaxed">
        <p><strong>Última actualización:</strong> Enero 2025</p>
        <h2>Plazo de devolución</h2>
        <p>Plazo de <strong>14 días naturales</strong> desde la recepción del pedido.</p>
        <h2>Condiciones</h2>
        <ul>
          <li>Producto en embalaje original, sin signos de uso o manipulación</li>
          <li>Contactar previamente con GSMGC para obtener autorización</li>
          <li>Gastos de envío a cargo del cliente, salvo error o defecto de fábrica</li>
        </ul>
        <h2>Garantía de 6 meses</h2>
        <p>Todos los productos tienen garantía de 6 meses contra defectos de fabricación. Contactar facilitando número de pedido y descripción del problema.</p>
        <h2>Productos excluidos</h2>
        <p>Productos personalizados, pantallas instaladas, cables y accesorios de consumo abiertos no son susceptibles de devolución.</p>
      </div>
    </>
  );
}
