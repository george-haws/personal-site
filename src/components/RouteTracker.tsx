"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Must match PING_PATH in worker/ping-path.ts. */
const PING_PATH = "/nav";

/**
 * Reports client-side route changes to the Worker. The initial document load
 * is counted at the edge, so the first render only remembers where we are.
 */
export function RouteTracker() {
  const pathname = usePathname();
  const last = useRef<{ pathname: string; href: string } | null>(null);

  useEffect(() => {
    if (last.current === null) {
      last.current = { pathname, href: window.location.href };
      return;
    }
    if (last.current.pathname === pathname) return;

    const referrer = last.current.href;
    last.current = { pathname, href: window.location.href };
    // No Worker runs in front of `next dev`, so a ping would only 404.
    if (process.env.NODE_ENV === "development") return;
    const body = JSON.stringify({ url: pathname + window.location.search, referrer });
    fetch(PING_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics never surfaces errors to the visitor.
    });
  }, [pathname]);

  return null;
}
