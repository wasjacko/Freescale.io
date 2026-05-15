"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MueAvatar } from "@/components/MueAvatar";

type Mode = "login" | "signup";

export function AuthSheetTrigger({
  mode,
  className,
  children,
}: {
  mode: Mode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <AuthSheet defaultMode={mode} onClose={() => setOpen(false)} />}
    </>
  );
}

function AuthSheet({
  defaultMode,
  onClose,
}: {
  defaultMode: Mode;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const next = "/app";

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading("email");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setMessage({ kind: "info", text: "Vérifiez votre boîte mail pour confirmer votre adresse." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setMessage(null);
    setLoading("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Connexion Google impossible.",
      });
      setLoading(null);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div
      className="auth-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isSignup ? "Créer un compte" : "Se connecter"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-sheet">
        <button
          type="button"
          className="auth-sheet-close"
          aria-label="Fermer"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="auth-sheet-mue">
          <MueAvatar />
        </div>

        <div className="auth-sheet-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={`auth-sheet-tab ${!isSignup ? "is-active" : ""}`}
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
          >
            Se connecter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={`auth-sheet-tab ${isSignup ? "is-active" : ""}`}
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
          >
            Créer un compte
          </button>
        </div>

        <p className="auth-sheet-sub">
          {isSignup
            ? "Une inbox unifiée + Mue. Prêt en 2 minutes."
            : "Bon retour. Accédez à votre inbox unifiée."}
        </p>

        <div className="auth-sheet-oauth">
          <button
            type="button"
            className="auth-oauth-btn"
            disabled={loading !== null}
            onClick={handleGoogle}
          >
            <GoogleIcon />
            {loading === "google" ? "Redirection…" : "Continuer avec Google"}
          </button>
        </div>

        <div className="auth-divider"><span>ou</span></div>

        <form className="auth-form" onSubmit={handleEmail}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@example.com"
            />
          </label>
          <label className="auth-field">
            <span>Mot de passe</span>
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={loading !== null}>
            {loading === "email"
              ? "…"
              : isSignup
              ? "Créer mon compte"
              : "Se connecter"}
          </button>
        </form>

        {message && (
          <div className={`auth-msg auth-msg-${message.kind}`}>{message.text}</div>
        )}

        <p className="auth-sheet-fine">
          En continuant, vous acceptez nos conditions d&apos;utilisation.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
