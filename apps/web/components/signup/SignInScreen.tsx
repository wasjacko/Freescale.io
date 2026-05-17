"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MueAvatar } from "@/components/MueAvatar";

export function SignInScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const next = searchParams.get("next") ?? "/app";
  const justSignedOut = searchParams.has("signedout");
  const isSwitching = searchParams.has("switch");
  const justDeleted = searchParams.has("deleted");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "google" | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(
    justDeleted
      ? {
          kind: "info",
          text: "Votre compte a été définitivement supprimé. Toutes vos données ont été effacées.",
        }
      : justSignedOut
        ? { kind: "info", text: "Vous êtes bien déconnecté. Connectez-vous avec un autre compte." }
        : isSwitching
          ? { kind: "info", text: "Connectez-vous avec un autre compte pour changer." }
          : null
  );

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading("password");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.replace(next as never);
      router.refresh();
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Connexion impossible.",
      });
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setMsg(null);
    setLoading("google");
    try {
      // Unified flow: request Gmail scopes at sign-in time so we get a
      // Google refresh-token in the Supabase session right away. The
      // /auth/callback handler picks those up and stores them as a Gmail
      // channel_account — the user is logged in AND has Gmail connected
      // in a single click, no separate "Connect Gmail" step.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          scopes: [
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
          ].join(" "),
          queryParams: {
            // offline + consent = guarantees we get a refresh_token back
            // (Google omits it on subsequent grants if not forced).
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Connexion Google impossible.",
      });
      setLoading(null);
    }
  };

  return (
    <div className="onb-stage">
      <header className="onb-stage-head">
        <Link href="/" className="onb-mue" aria-label="Retour à l'accueil">
          <MueAvatar />
        </Link>
        <span className="onb-step-tag">Connexion</span>
      </header>

      <main className="onb-stage-main">
        <div className="onb-body">
          <h1 className="onb-title">Bon retour.</h1>
          <p className="onb-sub">Accédez à votre inbox unifiée.</p>

          <div className="onb-auth-providers">
            <button
              type="button"
              className="onb-provider"
              disabled={loading !== null}
              onClick={handleGoogle}
            >
              <GoogleIcon />
              {loading === "google" ? "Redirection…" : "Continuer avec Google"}
            </button>
            <button type="button" className="onb-provider" disabled>
              <AppleIcon />
              Continuer avec Apple
              <span className="onb-provider-tag">Bientôt</span>
            </button>
          </div>

          <div className="onb-divider"><span>ou</span></div>

          <form className="onb-form" onSubmit={handlePassword}>
            <label className="onb-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@example.com"
              />
            </label>
            <label className="onb-field">
              <div className="onb-field-label-row">
                <span>Mot de passe</span>
                <Link href="/forgot-password" className="onb-link onb-link-tiny">
                  Oublié ?
                </Link>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
              />
            </label>
            <button
              type="submit"
              className="onb-btn onb-btn-primary onb-btn-block"
              disabled={loading !== null}
            >
              {loading === "password" ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          {msg && <div className={`auth-msg auth-msg-${msg.kind}`}>{msg.text}</div>}

          <p className="onb-fine onb-fine-center">
            Pas encore de compte ?{" "}
            <Link href="/sign-up" className="onb-link">Démarrer</Link>
          </p>
        </div>
      </main>

      <footer className="onb-stage-foot" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
