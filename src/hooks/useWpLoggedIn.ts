"use client";

import { useState, useEffect } from "react";

/**
 * Detect WordPress logged-in state via cookie.
 * Returns: "loading" (initial), true (logged in), false (guest)
 *
 * Checks for `wordpress_logged_in_*` cookie set by WP when user logs in.
 * This works when the Next.js site is on the same domain as WP (gsmgc.es).
 *
 * Also supports:
 * - URL parameter ?auth=1 (temporary solution before DNS switch)
 * - localStorage `gsmgc_token` (aligned with current site behavior)
 */
export function useWpLoggedIn(): boolean | "loading" {
  const [loggedIn, setLoggedIn] = useState<boolean | "loading">("loading");

  useEffect(() => {
    // Server-side: can't read document.cookie
    if (typeof document === "undefined") return;

    // 1. Check WordPress cookie (works after DNS switch)
    const cookies = document.cookie;
    const hasWpCookie = cookies
      .split(";")
      .map((c) => c.trim())
      .some((c) => c.startsWith("wordpress_logged_in_"));

    // 2. Check URL parameter (temporary solution before DNS switch)
    const authParam = new URLSearchParams(window.location.search).get("auth");

    // 3. Check localStorage token (aligned with current site)
    const hasToken = !!localStorage.getItem("gsmgc_token");

    const isLoggedIn = hasWpCookie || authParam === "1" || hasToken;
    setLoggedIn(isLoggedIn);
  }, []);

  return loggedIn;
}
