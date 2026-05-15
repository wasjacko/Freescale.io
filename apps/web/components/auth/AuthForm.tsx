"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MueAvatar } from "@/components/MueAvatar";

type Mode = "login" | "signup";

const TAGLINE: Record<Mode, { title: string; subtitle: string; cta: string; alt: string; altLink: string; altLabel: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to access your unified inbox.",
    cta: "Continue with email",
    alt: "New to Freescale?",
    altLink: "/signup",
    altLabel: "Create an account",
  },
  signup: {
    title: "Get started with Freescale",
    subtitle: "One inbox for all your client channels.",
    cta: "Create account",
    alt: "Already have an account?",
    altLink: "/login",
    altLabel: "Sign in",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | "apple" | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const supabase = createClient();
  const t = TAGLINE[mode];

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
        setMessage({ kind: "info", text: "Check your inbox to confirm your email." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next as never);
        router.refresh();
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setMessage(null);
    setLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "OAuth error" });
      setLoading(null);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-avatar">
        <MueAvatar />
      </div>
      <h1 className="auth-title">{t.title}</h1>
      <p className="auth-subtitle">{t.subtitle}</p>

      <div className="auth-oauth">
        <button
          type="button"
          className="auth-oauth-btn"
          onClick={() => handleOAuth("google")}
          disabled={loading !== null}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.67-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
            <path fill="#FBBC04" d="M5.84 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83Z"/>
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.37 14.97.5 12 .5A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38v-.63Z"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          className="auth-oauth-btn"
          onClick={() => handleOAuth("apple")}
          disabled={loading !== null}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor">
            <path d="M17.5 12.5c0-2.4 2-3.5 2-3.5s-1.1-1.6-2.8-1.6c-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.2 2-1.4 2.4-.4 5.9 1 7.8.7.9 1.5 2 2.5 1.9 1 0 1.4-.6 2.6-.6s1.6.6 2.7.6 1.7-.9 2.4-1.8c.7-1 1-2 1-2-.1 0-2.8-1-2.8-2.8Zm-2-5.3c.6-.7.9-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 0 1.9-.5 2.5-1.2Z"/>
          </svg>
          Continue with Apple
        </button>
      </div>

      <div className="auth-divider"><span>or</span></div>

      <form className="auth-form" onSubmit={handleEmail}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alexandre@freescale.app"
            required
            autoComplete="email"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        <button type="submit" className="auth-submit" disabled={loading !== null}>
          {loading === "email" ? "…" : t.cta}
        </button>
      </form>

      {message && <div className={`auth-msg auth-msg-${message.kind}`}>{message.text}</div>}

      <div className="auth-alt">
        {t.alt}{" "}
        <a href={t.altLink}>{t.altLabel}</a>
      </div>
    </div>
  );
}
