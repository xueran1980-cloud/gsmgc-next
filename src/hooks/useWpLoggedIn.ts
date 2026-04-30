"use client";

import { useState, useEffect } from "react";

/**
 * Detect WordPress logged-in state via cookie.
 * Returns: "loading" (initial), true (logged in), false (guest)
 *
 * Checks for `wordpress_logged_in_*` cookie set by WP when user logs in.
 * This works when the Next.js site is on the same domain as WP (gsmgc.es).
 */
export function useWpLoggedIn(): boolean | "loading" {
  const [loggedIn, setLoggedIn] = useState<boolean | "loading">("loading");

  useEffect(() => {
    // Server-side: can't read document.cookie
    if (typeof document === "undefined") return;

    const cookies = document.cookie;
    const hasWpCookie = cookies
      .split(";")
      .map((c) => c.trim())
      .some((c) => c.startsWith("wordpress_logged_in_"));

    setLoggedIn(hasWpCookie);
  }, []);

  return loggedIn;
}
