"use client";

import { useRouter } from "next/navigation";
import type { MouseEventHandler } from "react";

/**
 * Secondary action on the 404 page: returns to whatever page the visitor
 * came from via browser history. If there is nowhere to go back to (direct
 * link, fresh tab), it falls back to the homepage instead of doing nothing.
 */
export default function BackButton({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleClick: MouseEventHandler<HTMLButtonElement> = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
