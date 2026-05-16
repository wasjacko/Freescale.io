"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";

/**
 * Reads ?connected=... / ?synced=... query params on first paint, pushes a
 * toast, then strips them from the URL so a refresh doesn't re-fire.
 */
export function FlashFromUrl() {
  const router = useRouter();
  const params = useSearchParams();
  const push = useToast((s) => s.push);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const connected = params.get("connected");
    const email = params.get("email");
    const syncedRaw = params.get("synced");
    const error = params.get("error");

    if (connected === "gmail") {
      const synced = syncedRaw ? Number(syncedRaw) : 0;
      const tail =
        synced > 0
          ? ` · ${synced} message${synced > 1 ? "s" : ""} importé${synced > 1 ? "s" : ""}`
          : "";
      push({
        text: `Gmail connecté${email ? ` (${decodeURIComponent(email)})` : ""}${tail}`,
        duration: 4200,
      });
      fired.current = true;
    } else if (error) {
      push({
        text: `Erreur : ${decodeURIComponent(error)}`,
        duration: 5000,
      });
      fired.current = true;
    } else {
      return;
    }

    // Strip query params so we don't re-fire on every render / refresh.
    const url = new URL(window.location.href);
    url.searchParams.delete("connected");
    url.searchParams.delete("email");
    url.searchParams.delete("synced");
    url.searchParams.delete("error");
    router.replace(`${url.pathname}${url.search}` as never);
  }, [params, push, router]);

  return null;
}
