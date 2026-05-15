"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MueAvatar } from "@/components/MueAvatar";

export function ForgotPasswordScreen() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Envoi impossible.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onb-stage">
      <header className="onb-stage-head">
        <Link href="/" className="onb-mue" aria-label="Retour à l'accueil">
          <MueAvatar />
        </Link>
        <span className="onb-step-tag">Mot de passe oublié</span>
      </header>

      <main className="onb-stage-main">
        <div className="onb-body">
          {sent ? (
            <>
              <h1 className="onb-title">Vérifiez vos emails.</h1>
              <p className="onb-sub">
                Si un compte existe pour <strong>{email}</strong>, vous allez recevoir un
                lien pour choisir un nouveau mot de passe. Le lien expire dans 60 minutes.
              </p>

              <div className="onb-actions onb-actions-between">
                <button
                  className="onb-btn onb-btn-quiet"
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setMsg(null);
                  }}
                >
                  Changer d&apos;email
                </button>
                <Link href="/sign-in" className="onb-btn onb-btn-primary">
                  Retour à la connexion
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="onb-title">Mot de passe oublié.</h1>
              <p className="onb-sub">
                Entrez l&apos;email de votre compte. On vous envoie un lien pour choisir
                un nouveau mot de passe.
              </p>

              <form className="onb-form" onSubmit={handleSubmit}>
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
                <button
                  type="submit"
                  className="onb-btn onb-btn-primary onb-btn-block"
                  disabled={loading || !email.includes("@")}
                >
                  {loading ? "Envoi…" : "Envoyer le lien"}
                </button>
              </form>

              {msg && <div className={`auth-msg auth-msg-${msg.kind}`}>{msg.text}</div>}

              <p className="onb-fine onb-fine-center">
                <Link href="/sign-in" className="onb-link">Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="onb-stage-foot" />
    </div>
  );
}
