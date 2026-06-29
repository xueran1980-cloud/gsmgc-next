/**
 * 图片 URL 统一策略层 — Image Source Policy
 *
 * 确保所有图片 URL 统一指向 api.gsmgc.es（VPS 直供），
 * 利用 CF 30 天边缘缓存，彻底绕开 Vercel 的 Origin Transfer 消耗。
 *
 * 使用方式：所有位置的 img src / product.images[].src 统一过这个函数。
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Guard: already correct — prevent double-replace (api → api.api)
  if (url.startsWith("https://api.gsmgc.es/")) {
    return url;
  }

  // Legacy: convert frontend domain to backend domain
  return url.replace(
    "https://gsmgc.es/wp-content",
    "https://api.gsmgc.es/wp-content"
  );
}
