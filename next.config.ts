import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片优化：限制 /wp-content/uploads/** 路径（安全加固）
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.gsmgc.es",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "gsmgc.es",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  // ISR 构建超时
  staticPageGenerationTimeout: 300,
  // 旧英语路径 301 重定向
  async redirects() {
    return [
      { source: "/shop", destination: "/tienda", permanent: true },
      { source: "/product/:id*", destination: "/producto/:id*", permanent: true },
    ];
  },
  // WP 后台代理（与现站一致）
  async rewrites() {
    return [
      { source: "/wp-admin/:path*", destination: "https://api.gsmgc.es/wp-admin/:path*" },
      { source: "/wp-login.php", destination: "https://api.gsmgc.es/wp-login.php" },
      { source: "/wp-content/:path*", destination: "https://api.gsmgc.es/wp-content/:path*" },
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
