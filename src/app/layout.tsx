import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GSMGC - Repuestos para Móviles Mayorista B2B | Canarias",
  description: "GSMGC - Tu mayorista de accesorios móviles en Canarias. Más de 2.000 productos B2B: pantallas, fundas, baterías, cargadores. Envío 24h a Gran Canaria y Tenerife.",
  keywords: ["repuestos móviles", "accesorios móvil", "mayorista Canarias", "GSMGC", "pantallas iPhone", "baterías Samsung", "fundas Xiaomi"],
  metadataBase: new URL("https://gsmgc.es"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://gsmgc.es",
    siteName: "GSMGC Accesorios Móvil",
    title: "GSMGC - Repuestos para Móviles Mayorista B2B | Canarias",
    description: "Distribuidor mayorista de accesorios y repuestos para móviles en Canarias.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GSMGC - Repuestos para Móviles Mayorista B2B | Canarias",
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
    <html lang="es">
      <body className={`${inter.className} font-sans antialiased`}>
        <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <WhatsAppFloat />
          </CartProvider>
      </body>
    </html>
  );
}
