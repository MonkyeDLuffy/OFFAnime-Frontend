"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="glass-btn mt-7 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium text-white"
    >
      {isPending ? "Retrying…" : "Try again"}
    </button>
  );
}
