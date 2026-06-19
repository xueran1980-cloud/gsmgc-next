import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Non-ASCII slug sanitizer
 * Next.js cache-tags use raw slug value → non-ASCII chars cause ERR_INVALID_CHAR
 * Only affects ~3 products (IDs 7138/7145/5735 with ★ or Chinese chars)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast path: most URLs are pure ASCII
  if (!/[^\x00-\x7F]/.test(pathname)) return;

  const clean = pathname
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (clean !== pathname && clean.length > 1) {
    const newUrl = new URL(clean, request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl, 301);
  }
}
