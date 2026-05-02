// GSMGC API Configuration — single source of truth
//
// ★ v5.1: 双通道策略
//   服务端（SSG/SSR/API Routes）：绝对 URL https://api.gsmgc.es/... + User-Agent
//   客户端（浏览器）：走 /api/proxy/（Vercel rewrite → api.gsmgc.es）

// ★ 客户端专用 — 只在浏览器端使用（Vercel rewrite 转发）
export const API_BASE = '/api/proxy/wp-json/gsmgc/v1';
export const SITE_URL = 'https://gsmgc.es';
// Alias for backward compatibility
export { SITE_URL as SITE };
