"use client";

import { MueAvatar } from "@/components/MueAvatar";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ResetPasswordScreen() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [ready, setReady] = useState(false);

  // Supabase appends the recovery token as a URL hash. The client SDK exchanges
  // it for a session automatically on mount; we just wait until a session is
  // present before letting the user submit a new password.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setMsg({
          kind: "error",
          text: "Lien expiré ou invalide. Demandez un nouveau lien.",
        });
      } else {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ kind: "error", text: "Au moins 8 caractères." });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "error", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="onb-stage">
      <header className="onb-stage-head">
        <Link href="/" className="onb-mue" aria-label="Retour à l'accueil">
          <MueAvatar />
        </Link>
        <span className="onb-step-tag">Nouveau mot de passe</span>
      </header>

      <main className="onb-stage-main">
        <div className="onb-body">
          <h1 className="onb-title">Choisissez un nouveau mot de passe.</h1>
          <p className="onb-sub">
            Au moins 8 caractères. Évitez les mots de passe que vous utilisez ailleurs.
          </p>

          <form className="onb-form" onSubmit={handleSubmit}>
            <label className="onb-field">
              <span>Nouveau mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                disabled={!ready}
              />
            </label>
            <label className="onb-field">
              <span>Confirmer</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retapez le même mot de passe"
                disabled={!ready}
              />
            </label>
            <button
              type="submit"
              className="onb-btn onb-btn-primary onb-btn-block"
              disabled={!ready || loading || password.length < 8 || password !== confirm}
            >
              {loading ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </form>

          {msg && <div className={`auth-msg auth-msg-${msg.kind}`}>{msg.text}</div>}

          {!ready && !msg && <p className="onb-fine onb-fine-center">Vérification du lien…</p>}

          <p className="onb-fine onb-fine-center">
            <Link href="/sign-in" className="onb-link">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </main>

      <footer className="onb-stage-foot" />
    </div>
  );
}
