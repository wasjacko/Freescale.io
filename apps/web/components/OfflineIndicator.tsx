"use client";

import { useEffect, useState } from "react";

/**
 * Top-of-viewport indicator that surfaces when the browser is offline.
 * Listens to the standard `online` / `offline` window events. While
 * offline, action calls (send, sync, Mue) will fail at the network
 * layer — this banner tells the user that's expected, not a bug, so
 * they don't waste time wondering why nothing responds.
 *
 * When the connection comes back we auto-flash a short "Reconnecté"
 * confirmation so the user knows it's safe to resume.
 */
export function OfflineIndicator() {
  const [state, setState] = useState<"online" | "offline" | "reconnected">("online");

  useEffect(() => {
    let active = true;

    const checkOnlineStatus = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/health", {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res.ok;
      } catch {
        return false;
      }
    };

    const verifyConnection = async () => {
      const isServerOnline = await checkOnlineStatus();
      if (!active) return;
      if (isServerOnline) {
        setState((current) => {
          if (current === "offline") {
            setTimeout(() => {
              if (active) setState("online");
            }, 2500);
            return "reconnected";
          }
          return current;
        });
      } else {
        setState("offline");
      }
    };

    // Initial check on mount
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
    } else {
      void verifyConnection();
    }

    const onOnline = () => {
      // Browser says online, verify with server immediately
      void verifyConnection();
    };

    const onOffline = () => {
      if (active) setState("offline");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Poll every 30 seconds to check server health
    const timerId = window.setInterval(() => {
      void verifyConnection();
    }, 30000);

    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timerId);
    };
  }, []);

  if (state === "online") return null;

  return (
    <div
      className={`offline-indicator is-${state}`}
      role={state === "offline" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="offline-dot" aria-hidden />
      {state === "offline" ? (
        <span>
          <strong>Hors connexion.</strong> Les actions seront mises en attente.
        </span>
      ) : (
        <span>
          <strong>Reconnecté.</strong> Synchronisation en cours…
        </span>
      )}
    </div>
  );
}
