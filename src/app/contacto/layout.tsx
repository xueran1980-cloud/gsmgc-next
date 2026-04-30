import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto - GSMGC Mayorista Accesorios Móvil Canarias",
  description: "Contacta con GSMGC. WhatsApp 688 560 560, teléfono o email. Atención a distribuidores y talleres en Canarias. Respuesta en 24h.",
  alternates: { canonical: "https://gsmgc.es/contacto" },
};

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
