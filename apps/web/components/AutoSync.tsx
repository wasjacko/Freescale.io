"use client";

import { autoSyncStaleChannels } from "@/lib/actions/auto-sync";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fires a background channel sync on mount and whenever the tab becomes
 * visible again (typical "I came back to the app after a while" moment).
 * Throttled client-side to once per 60 s. Toggles DataContext.isSyncing so
 * downstream skeletons can show during the wait — especially important on
 * the very first sync when conversations.length is still 0.
 */
export function AutoSync() {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const { setIsSyncing, conversations } = useData();
  const lastRun = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    const run = async () => {
      const now = Date.now();
      if (inFlight.current) return;
      if (now - lastRun.current < 60_000) return;
      inFlight.current = true;
      // Only flip the global "syncing" flag when we have nothing yet — we
      // don't want to flash skeletons over a populated inbox.
      const hadNothing = conversations.length === 0;
      if (hadNothing) setIsSyncing(true);
      try {
        const report = await autoSyncStaleChannels();
        lastRun.current = Date.now();
        if (report.newMessages > 0) {
          if (!hadNothing) {
            push({
              text: `${report.newMessages} nouveau${report.newMessages > 1 ? "x" : ""} message${
                report.newMessages > 1 ? "s" : ""
              }`,
              duration: 3000,
            });
          }
          router.refresh();
        }
      } catch {
        // Silent fail — auto-sync is best-effort.
      } finally {
        inFlight.current = false;
        if (hadNothing) setIsSyncing(false);
      }
    };

    void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Periodic refresh while the tab is open and visible. The throttle
    // inside run() guarantees we don't fire more than once per minute
    // even if other events also call it.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [router, push, setIsSyncing, conversations.length]);

  return null;
}
