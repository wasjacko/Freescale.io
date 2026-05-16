"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { autoSyncStaleChannels } from "@/lib/actions/auto-sync";
import { useToast } from "@/lib/hooks/useToast";

/**
 * Fires a background channel sync on mount and whenever the tab becomes
 * visible again (typical "I came back to the app after a while" moment).
 * Throttled client-side to once per 60 s to avoid hammering the server.
 */
export function AutoSync() {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const lastRun = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    const run = async () => {
      const now = Date.now();
      if (inFlight.current) return;
      if (now - lastRun.current < 60_000) return;
      inFlight.current = true;
      try {
        const report = await autoSyncStaleChannels();
        lastRun.current = Date.now();
        if (report.newMessages > 0) {
          push({
            text: `${report.newMessages} nouveau${report.newMessages > 1 ? "x" : ""} message${
              report.newMessages > 1 ? "s" : ""
            }`,
            duration: 3000,
          });
          router.refresh();
        }
      } catch {
        // Silent fail — auto-sync is best-effort.
      } finally {
        inFlight.current = false;
      }
    };

    void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router, push]);

  return null;
}
