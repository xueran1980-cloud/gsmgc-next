// GSMGC API Configuration — single source of truth
//
// ★ v6.2: 统一策略
//   所有 API 请求走 fetchWithFallbackClient（直连 api.gsmgc.es → fallback proxy）
//   废弃 API_BASE（/api/proxy/ 代理模式，2026-05-09 清除）

export const API_BASE = 'https://api.gsmgc.es/wp-json/gsmgc/v1';
export const SITE_URL = 'https://gsmgc.es';
// Alias for backward compatibility
export { SITE_URL as SITE };
