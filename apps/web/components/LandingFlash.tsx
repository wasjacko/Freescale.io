"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Top-of-page flash banner shown on the landing after a sign-out or
 * account deletion. Reads URL search params, displays the right
 * message, and clears the param from the URL once dismissed so a
 * reload doesn't re-show the banner.
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

  useEffect(() => {
    setVisible(signedOut || deleted);
    // Auto-dismiss after 7s for "you signed out" (low information),
    // but keep the deletion banner sticky — it's a one-shot
    // confirmation of an irreversible action and the user might
    // want to read it twice.
    if (signedOut && !deleted) {
      const t = setTimeout(() => handleDismiss(), 7000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedOut, deleted]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    // Strip the param from the URL so a reload doesn't reflash.
    // router.replace keeps the scroll position vs window.location.href.
    router.replace("/" as never);
  };

  return (
    <div
      className={`landing-flash ${deleted ? "is-deleted" : "is-signedout"}`}
      role="status"
      aria-live="polite"
    >
      <span className="landing-flash-icon" aria-hidden>
        {deleted ? "✓" : "👋"}
      </span>
      <div className="landing-flash-text">
        {deleted ? (
          <>
            <strong>Compte supprimé.</strong> Toutes vos données ont été effacées définitivement.
          </>
        ) : (
          <>
            <strong>Vous êtes bien déconnecté.</strong> À bientôt sur Freescale.
          </>
        )}
      </div>
      <button
        type="button"
        className="landing-flash-close"
        onClick={handleDismiss}
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  );
}
