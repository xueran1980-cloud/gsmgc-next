/**
 * 图片 URL 统一策略层 — Image Source Policy
 *
 * WordPress 返回 gsmgc.es 域名的图片 URL，浏览器加载时走 Vercel 代理层。
 * 本函数将域名替换为 api.gsmgc.es，利用 CF 30 天边缘缓存直接返回，
 * 彻底绕开 Vercel 的 Origin Transfer 消耗。
 *
 * 使用方式：所有位置的 img src / product.images[].src 统一过这个函数。
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace("gsmgc.es/wp-content", "api.gsmgc.es/wp-content");
}

