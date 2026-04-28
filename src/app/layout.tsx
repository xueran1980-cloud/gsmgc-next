import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "GSMGC - Repuestos para Móviles al Por Mayor | Canarias",
    template: "%s | GSMGC Canarias",
  },
  description: "Distribuidor mayorista de accesorios y repuestos para móviles en Canarias. +2.100 referencias, precios competitivos, envío en 24h. Pantallas, baterías, fundas, cables y más.",
  keywords: ["repuestos móviles", "accesorios móvil", "mayorista Canarias", "GSMGC", "pantallas iPhone", "baterías Samsung", "fundas Xiaomi"],
  metadataBase: new URL("https://gsmgc.es"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://gsmgc.es",
    siteName: "GSMGC Accesorios Móvil",
    title: "GSMGC - Repuestos para Móviles al Por Mayor",
    description: "Distribuidor mayorista de accesorios y repuestos para móviles en Canarias.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GSMGC - Repuestos para Móviles al Por Mayor",
    description: "Distribuidor mayorista de accesorios y repuestos para móviles en Canarias.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <WhatsAppFloat />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
