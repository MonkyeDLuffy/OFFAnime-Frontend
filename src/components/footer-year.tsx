"use client";

/**
 * Footer copyright year. A tiny client island so the year is always current
 * at runtime — a server-rendered year would be frozen at build time once the
 * route is prerendered statically.
 */
export default function FooterYear() {
  return <>{new Date().getFullYear()}</>;
}
