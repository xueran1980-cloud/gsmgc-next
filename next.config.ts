import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片优化：允许外部图片域名
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yougsm.es",
      },
      {
        protocol: "https",
        hostname: "gsmgc.es",
      },
      {
        protocol: "https",
        hostname: "api.gsmgc.es",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  // ISR 构建超时
  staticPageGenerationTimeout: 300,
  // 旧英语路径 + 旧站死链接 301 重定向
  async redirects() {
    return [
      { source: "/shop", destination: "/tienda", permanent: true },
      { source: "/product/:id*", destination: "/producto/:id*", permanent: true },
      // 旧站遗留 URL → 301 到主页（旧站也是 SPA fallback 到 404）
      { source: "/aviso-legal", destination: "/politica-de-privacidad", permanent: true },
      { source: "/terminos", destination: "/condiciones-de-venta", permanent: true },
      { source: "/terminos-de-uso", destination: "/condiciones-de-venta", permanent: true },
      { source: "/aviso", destination: "/politica-de-privacidad", permanent: true },
      { source: "/legal", destination: "/politica-de-privacidad", permanent: true },
    ];
  },
  // WP 后台代理（与现站一致）
  async rewrites() {
    return [
      // 后台路径（现站已有）
      { source: "/wp-admin/:path*", destination: "https://api.gsmgc.es/wp-admin/:path*" },
      { source: "/wp-login.php", destination: "https://api.gsmgc.es/wp-login.php" },
      { source: "/wp-content/:path*", destination: "https://api.gsmgc.es/wp-content/:path*" },
      // Edge Proxy 转发（fetchViaEdgeProxy 用）
      { source: "/api/proxy/:path*", destination: "https://api.gsmgc.es/:path*" },
      // WP REST API 直连 fallback（directFetchViaWpJson 用）
      { source: "/wp-json/:path*", destination: "https://api.gsmgc.es/wp-json/:path*" },
    ];
  },
  // 安全头
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
