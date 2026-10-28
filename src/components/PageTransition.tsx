"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Wraps each route's page content so navigating between pages produces a
 * subtle, premium fade-in with a slight upward motion.
 *
 * - The navbar and footer (siblings of this wrapper in the root layout)
 *   stay mounted and stable through transitions — only the page content
 *   animates.
 * - ~300ms, respecting prefers-reduced-motion (instant, no animation).
 * - Runs once on initial load and once per route change (tracked via
 *   pathname), so back/forward navigations transition too.
 * - Never blocks interactions; the element is present and focusable from
 *   the first frame.
 *
 * The wrapper element is always rendered (identical on server and client)
 * so there is never a hydration mismatch; only the animation play state is
 * gated on the browser.
 */

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    if (pathname !== key) {
      setKey(pathname);
      setEntering(true);
    }
  }, [pathname, key]);

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(() => setEntering(false), 300);
    return () => window.clearTimeout(timer);
  }, [entering]);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className="animate-page-enter"
      style={{
        animationPlayState: reduced || !entering ? "paused" : "running",
        animationDuration: reduced ? "0ms" : "300ms",
      }}
    >
      {children}
    </div>
  );
}
