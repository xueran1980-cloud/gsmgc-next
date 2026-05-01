// GSMGC API Configuration — single source of truth
//
// ★ 架构说明：
//   api.gsmgc.es 的 SG Bot Protection 已关闭，不再需要 iframe 预热
//   所有 API fetch 直接走 CORS 跨域请求（或 Vercel rewrite 代理 fallback）

export const API_BASE = 'https://api.gsmgc.es';
export const GSMGC_API_DIRECT = `${API_BASE}/wp-json/gsmgc/v1`;
export const GSMGC_API_PROXY = '/wp-json/gsmgc/v1'; // Vercel rewrite fallback
export const SITE_URL = 'https://gsmgc.es';
// Alias for backward compatibility
export { SITE_URL as SITE };
