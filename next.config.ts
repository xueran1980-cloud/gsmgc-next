import type { NextConfig } from "next";

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.gsmgc.es https://www.google-analytics.com https://region1.google-analytics.com; frame-src 'self' https://api.gsmgc.es; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";

const PERMISSIONS_POLICY = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "yougsm.es" },
      { protocol: "https", hostname: "gsmgc.es" },
      { protocol: "https", hostname: "api.gsmgc.es", pathname: "/wp-content/uploads/**" },
    ],
  },
  staticPageGenerationTimeout: 300,

  // ★ 完整 301 重定向（旧站英语路径 + 死链）
  async redirects() {
    return [
      { source: "/shop", destination: "/tienda", permanent: true },
      { source: "/product/:id*", destination: "/producto/:id*", permanent: true },
      { source: "/product-category/:path*", destination: "/tienda", permanent: true },
      { source: "/cart", destination: "/checkout", permanent: true },
      { source: "/my-account", destination: "/mi-cuenta", permanent: true },
      { source: "/my-account/:path*", destination: "/mi-cuenta", permanent: true },
      { source: "/aviso-legal", destination: "/politica-de-privacidad", permanent: true },
      { source: "/terminos", destination: "/condiciones-de-venta", permanent: true },
      { source: "/terminos-de-uso", destination: "/condiciones-de-venta", permanent: true },
      { source: "/aviso", destination: "/politica-de-privacidad", permanent: true },
      { source: "/legal", destination: "/politica-de-privacidad", permanent: true },
      // ★ 2026-05-04: 清理废弃路由 → /tienda
      { source: "/tienda-v2", destination: "/tienda", permanent: true },
      { source: "/tienda-v2/:path*", destination: "/tienda/:path*", permanent: true },
      { source: "/tienda-old", destination: "/tienda", permanent: true },
      { source: "/tienda-old/:path*", destination: "/tienda/:path*", permanent: true },
      // ★ 2026-05-04: 修复旧站 URL 断裂（审计发现4个404）
      { source: "/envio", destination: "/envios-y-entregas", permanent: true },
      { source: "/quienes-somos", destination: "/sobre-nosotros", permanent: true },
      { source: "/politica-privacidad", destination: "/politica-de-privacidad", permanent: true },
      { source: "/politica-cookies", destination: "/politica-de-privacidad", permanent: true },
    ];
  },

  // WP 后台代理
  async rewrites() {
    return [
      { source: "/wp-admin/:path*", destination: "https://api.gsmgc.es/wp-admin/:path*" },
      { source: "/wp-login.php", destination: "https://api.gsmgc.es/wp-login.php" },
      { source: "/wp-content/:path*", destination: "https://api.gsmgc.es/wp-content/:path*" },
      { source: "/wp-json/:path*", destination: "https://api.gsmgc.es/wp-json/:path*" },
    ];
  },

  // ★ 完整安全头（从旧站 vercel.json 迁移）
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: CSP },
          { key: "Access-Control-Allow-Origin", value: "https://gsmgc.es" },
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
        ],
      },
      // ★ v9.10: 强制浏览器每次验证 HTML — 排除 ISR 页面
      {
        source: "/((?!_next/|wp-|api/|favicon|producto/).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // ★ 性能优化: products-raw API 允许 CDN 缓存 120s
      // v9.3 返回全量数据，不区分用户状态 → 符合 CDN 缓存条件
      {
        source: "/wp-json/gsmgc/v1/products-raw",
        headers: [
          { key: "Cache-Control", value: "public, max-age=120, s-maxage=120" },
        ],
      },
      {
        source: "/wp-json/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
