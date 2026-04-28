import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad - GSMGC",
  description: "Política de privacidad y protección de datos. Cómo tratamos la información de nuestros clientes B2B.",
  alternates: { canonical: "https://gsmgc.es/politica-de-privacidad" },
};

export default function PrivacidadPage() {
  return (
    <>
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <h1 className="text-4xl font-black mb-2">Política de Privacidad</h1>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-16 prose prose-gray max-w-none text-sm text-gray-600 leading-relaxed">
        <p><strong>Última actualización:</strong> Enero 2025</p>
        <h2>1. Responsable del tratamiento</h2>
        <p>YOU MOBILE CANARIAS SL (GSMGC), C/ Mayor 45, 35001 Las Palmas de Gran Canaria. Email: info@gsmgc.es</p>
        <h2>2. Datos que tratamos</h2>
        <ul>
          <li>Datos de identificación: nombre, apellidos, razón social, CIF/NIF</li>
          <li>Datos de contacto: email, teléfono, dirección</li>
          <li>Datos comerciales: historial de pedidos, facturación</li>
        </ul>
        <h2>3. Finalidad</h2>
        <p>Gestionar la relación comercial, procesar pedidos, facturar y cumplir obligaciones legales.</p>
        <h2>4. Base legal</h2>
        <p>Ejecución contractual, consentimiento y cumplimiento de obligaciones legales.</p>
        <h2>5. Conservación</h2>
        <p>Los datos se conservarán durante la relación comercial y los plazos legales exigibles.</p>
        <h2>6. Derechos</h2>
        <p>Acceso, rectificación, supresión, limitación, portabilidad y oposición. Contactar: info@gsmgc.es</p>
      </div>
    </>
  );
}
