import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GSMGC - Repuestos para Móviles Mayorista B2B | Canarias",
  description: "Mayorista B2B de accesorios para móviles en Canarias. +2.100 productos, envío 24h a Gran Canaria y Tenerife. Precios wholesale.",
  keywords: "repuestos móvil Canarias, accesorios móvil mayorista, piezas móvil Las Palmas, charger手机配件批发, wholesale phone parts Spain, accesorios tablets, repuestos Samsung, repuestos iPhone",
  metadataBase: new URL("https://gsmgc.es"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://gsmgc.es/",
    siteName: "GSMGC",
    title: "GSMGC - Repuestos para Móviles Mayorista B2B | Canarias",
    description: "Tu distribuidor de confianza de accesorios móviles en Canarias. Más de 2000 productos para profesionales. Envío rápido a Gran Canaria y Tenerife.",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GSMGC - Mayorista Accesorios Móviles Canarias",
    description: "Mayorista accesorios móviles Canarias. 2000+ productos B2B. Envío 24h.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  other: {
    "googlebot": "index, follow",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="geo.region" content="ES-CN" />
        <meta name="geo.placename" content="Canarias" />
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563eb'/><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='900' font-size='14'>GS</text></svg>" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
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
