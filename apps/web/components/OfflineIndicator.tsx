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
  // Default to "online" on first render to avoid SSR/CSR mismatch.
  // Then sync with the actual state on mount.
  const [state, setState] = useState<"online" | "offline" | "reconnected">(
    "online"
  );

  useEffect(() => {
    // Sync initial state from the browser (might already be offline
    // when component mounts).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
    }
    const onOnline = () => {
      setState("reconnected");
      // Auto-hide the "reconnected" pill after 2.5s.
      setTimeout(() => setState("online"), 2500);
    };
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
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
