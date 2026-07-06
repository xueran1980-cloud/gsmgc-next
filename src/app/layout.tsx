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
        {/* ── PWA ── */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GSMGC" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" sizes="192x192" />
        <link rel="dns-prefetch" href="https://api.gsmgc.es" />
        <link rel="preconnect" href="https://api.gsmgc.es" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        {/* NAV DIAG: intercept History API before React/Next.js code runs */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var _push = history.pushState;
  var _replace = history.replaceState;
  var _href = location.href;

  history.pushState = function() {
    var now = Date.now();
    var toUrl = arguments[2] || '';
    console.log('[NAV:' + now + '] pushState | from=' + _href + ' | to=' + toUrl);
    _href = location.href;
    return _push.apply(this, arguments);
  };
  history.replaceState = function() {
    var now = Date.now();
    var toUrl = arguments[2] || '';
    console.log('[NAV:' + now + '] replaceState | from=' + _href + ' | to=' + toUrl);
    _href = location.href;
    return _replace.apply(this, arguments);
  };

  window.addEventListener('popstate', function() {
    console.log('[NAV:' + Date.now() + '] popstate | url=' + location.href);
  });
  window.addEventListener('pageshow', function(e) {
    console.log('[NAV:' + Date.now() + '] pageshow | persisted=' + e.persisted + ' | url=' + location.href);
  });
  window.addEventListener('beforeunload', function() {
    console.log('[NAV:' + Date.now() + '] beforeunload | url=' + location.href);
  });

  console.log('[NAV] DIAG INSTALLED | url=' + location.href);
})();
        ` }} />
        <AuthProvider>
        <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <WhatsAppFloat />
          </CartProvider>
        </AuthProvider>
        {/* PWA Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
