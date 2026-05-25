"use client";

import { toast } from "@/lib/hooks/useToast";
import { getLandingFlashPresentation } from "@/lib/landing-flash";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shows a quiet floating toast after sign-out and retains a prominent
 * banner for permanent account deletion. Both states are sourced from
 * URL params and removed after acknowledgement so refreshes do not
 * repeat the notice.
 *
 * Why on the landing and not on /welcome: signing out is "I'm done
 * for now", not "I want to log in again right this second". The
 * marketing context lets the user decide whether to re-engage on
 * their own terms.
 */
export function LandingFlash() {
  const router = useRouter();
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);
  const signedOut = params.has("signedout");
  const deleted = params.has("deleted");
  const presentation = getLandingFlashPresentation({ signedOut, deleted });
  const fired = useRef(false);

  const clearIntent = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("signedout");
    url.searchParams.delete("deleted");
    router.replace(`${url.pathname}${url.search}${url.hash}` as never);
  }, [router]);

  useEffect(() => {
    if (!presentation || fired.current) return;
    fired.current = true;

    if (presentation === "signedout-toast") {
      toast.success("Vous êtes bien déconnecté. À bientôt sur Freescale.", { duration: 4200 });
      clearIntent();
      return;
    }

    setVisible(true);
  }, [clearIntent, presentation]);

  if (!visible || presentation !== "deleted-banner") return null;

  return (
    <div className="landing-flash is-deleted" role="status" aria-live="polite">
      <span className="landing-flash-icon" aria-hidden>
        ✓
      </span>
      <div className="landing-flash-text">
        <strong>Compte supprimé.</strong> Toutes vos données ont été effacées définitivement.
      </div>
      <button
        type="button"
        className="landing-flash-close"
        onClick={() => {
          setVisible(false);
          clearIntent();
        }}
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  );
}
