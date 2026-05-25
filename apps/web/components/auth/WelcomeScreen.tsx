"use client";

import { MueAvatar } from "@/components/MueAvatar";
import { appUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * /welcome — the single auth surface for both new and returning users.
 *
 * Architecture follows the audit recommendation: identity FIRST, inbox
 * connection LATER. No profiling questions before auth. The post-auth
 * routing in /auth/callback decides whether the user lands in onboarding
 * mode (no inbox yet) or straight into /app with their existing setup.
 *
 * Three CTAs by spec:
 *   1. Google      → OAuth + Gmail scopes (combined flow, biggest button)
 *   2. Email       → magic link via Supabase signInWithOtp
 *   3. Apple       → "bientôt" — requires Apple Developer setup, deferred
 *
 * Google already owns the permissions-consent step in OAuth, so returning
 * users leave this screen in one click instead of crossing an app interstitial.
 */
export function WelcomeScreen() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const next = searchParams.get("next") ?? "/app";
  const isSwitching = searchParams.has("switch");
  const oauthError = searchParams.get("error");

  const [mode, setMode] = useState<"choice" | "email" | "email-sent">("choice");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(
    oauthError === "auth_callback"
      ? "Connexion interrompue. Réessayez ou choisissez une autre méthode."
      : oauthError === "missing_code"
        ? "Code de connexion manquant. Réessayez."
        : null
  );

  // The "switch account" intent gets a non-error informational banner.
  // Sign-out / deletion confirmations live on the landing now — they
  // don't pass through /welcome anymore.
  const banner = isSwitching ? "Connectez-vous avec un autre compte." : null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
          scopes: [
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
          ].join(" "),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion Google impossible.");
      setLoading(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("email");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setMode("email-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="welcome-wrap">
      <div
        className="welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <div className="welcome-brand">
          <MueAvatar />
          <span>Freescale</span>
        </div>

        {banner && <div className="welcome-banner">{banner}</div>}

        {mode === "choice" && (
          <>
            <h1 id="welcome-title" className="welcome-title">
              Votre inbox, enfin actionnable.
            </h1>
            <p className="welcome-sub">
              Unifiez vos boîtes mail. Le copilote Mue repère les messages importants et propose des
              tâches prêtes à traiter.
            </p>

            <div className="welcome-ctas">
              <button
                type="button"
                className="welcome-cta welcome-cta-primary"
                onClick={handleGoogleSignIn}
                disabled={loading !== null}
              >
                <GoogleIcon />
                {loading === "google" ? "Redirection…" : "Continuer avec Google"}
              </button>

              <button
                type="button"
                className="welcome-cta welcome-cta-soft"
                onClick={() => setMode("email")}
                disabled={loading !== null}
              >
                <MailIcon />
                Continuer avec email
              </button>

              <button
                type="button"
                className="welcome-cta welcome-cta-disabled"
                disabled
                title="Bientôt"
              >
                <AppleIcon />
                Continuer avec Apple
                <span className="welcome-soon">Bientôt</span>
              </button>
            </div>

            <p className="welcome-fine">
              En continuant, vous acceptez les{" "}
              <a href="/terms" className="welcome-link">
                conditions
              </a>{" "}
              et la{" "}
              <a href="/privacy" className="welcome-link">
                politique de confidentialité
              </a>
              .
            </p>
          </>
        )}

        {mode === "email" && (
          <>
            <button
              type="button"
              className="welcome-back"
              onClick={() => setMode("choice")}
              aria-label="Retour"
            >
              ← Retour
            </button>

            <h1 className="welcome-title">Continuer avec email</h1>
            <p className="welcome-sub">
              On vous envoie un lien magique. Pas de mot de passe à retenir.
            </p>

            <form onSubmit={handleMagicLink} className="welcome-form">
              <input
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="welcome-input"
                disabled={loading !== null}
              />
              <button
                type="submit"
                className="welcome-cta welcome-cta-primary"
                disabled={loading !== null || !email.includes("@")}
              >
                {loading === "email" ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
          </>
        )}

        {mode === "email-sent" && (
          <>
            <div className="welcome-success">
              <MailSentIcon />
            </div>
            <h1 className="welcome-title">Vérifiez votre email</h1>
            <p className="welcome-sub">
              On vous a envoyé un lien à <strong>{email}</strong>. Cliquez dessus pour vous
              connecter — pensez à vérifier vos spams.
            </p>
            <button
              type="button"
              className="welcome-cta welcome-cta-soft"
              onClick={() => setMode("email")}
            >
              Changer d'email
            </button>
            <p className="welcome-fine">
              <Link href={"/" as never} className="welcome-link">
                Retour à l'accueil
              </Link>
            </p>
          </>
        )}

        {error && <div className="welcome-error">{error}</div>}
      </div>
    </div>
  );
}

// ────────── Inline SVG icons (no extra dependency, keeps bundle tiny)

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.05 13.04c-.03-2.79 2.28-4.13 2.39-4.2-1.31-1.91-3.34-2.17-4.06-2.2-1.73-.17-3.37 1.02-4.25 1.02-.87 0-2.22-.99-3.65-.96-1.88.03-3.61 1.09-4.58 2.77-1.95 3.4-.5 8.42 1.4 11.18.92 1.35 2.02 2.87 3.46 2.82 1.39-.05 1.91-.9 3.59-.9 1.68 0 2.15.9 3.62.87 1.49-.03 2.43-1.38 3.34-2.74 1.05-1.57 1.49-3.1 1.51-3.17-.03-.02-2.9-1.11-2.93-4.41zM14.43 5.06c.76-.92 1.27-2.2 1.13-3.48-1.09.04-2.42.73-3.21 1.65-.71.81-1.33 2.12-1.17 3.37 1.22.09 2.48-.62 3.25-1.54z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

function MailSentIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
