import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Cuenta - Acceso Clientes B2B | GSMGC Canarias",
  description: "Accede a tu cuenta mayorista B2B. Gestiona pedidos, direcciones y datos de facturación. Registro para distribuidores en Canarias.",
  alternates: { canonical: "https://gsmgc.es/mi-cuenta" },
};

export default function MiCuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
