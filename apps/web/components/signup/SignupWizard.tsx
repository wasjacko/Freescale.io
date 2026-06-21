"use client";

import { MueAvatar } from "@/components/MueAvatar";
import { ChannelLogo } from "@/components/icons/Icon";
import { OtpInput } from "@/components/signup/OtpInput";
import { applySignupAnswers } from "@/lib/actions/signup";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type Draft = {
  firstName: string;
  role: string;
  channelsPicked: string[];
  dailyVolume: string;
  topPain: string;
};

const EMPTY: Draft = {
  firstName: "",
  role: "",
  channelsPicked: [],
  dailyVolume: "",
  topPain: "",
};

const STORAGE_KEY = "freescale:signup-draft";

const ROLES = [
  { id: "freelance", label: "Freelance" },
  { id: "founder", label: "Founder" },
  { id: "designer", label: "Designer" },
  { id: "marketer", label: "Marketer / Sales" },
  { id: "other", label: "Autre" },
];

const CHANNELS = [
  { id: "gmail", label: "Gmail" },
  { id: "slack", label: "Slack" },
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "discord", label: "Discord" },
];

const VOLUMES = [
  { id: "low", label: "Moins de 50 par jour" },
  { id: "mid", label: "Entre 50 et 200" },
  { id: "high", label: "Plus de 200" },
];

const PAINS = [
  { id: "switching", label: "Jongler entre les apps" },
  { id: "forgetting", label: "Oublier des tâches" },
  { id: "drafting", label: "Rédiger les bonnes réponses" },
  { id: "all", label: "Honnêtement, tout ça à la fois" },
];

type StepId = "role" | "channels" | "volume" | "pain" | "name" | "auth";
const STEPS: StepId[] = ["role", "channels", "volume", "pain", "name", "auth"];

export function SignupWizard() {
  const supabase = createClient();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<StepId>("role");
  const [hydrated, setHydrated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authPhase, setAuthPhase] = useState<"email" | "code">("email");
  const [authLoading, setAuthLoading] = useState<"send" | "verify" | "google" | null>(null);
  const [authMsg, setAuthMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft, hydrated]);

  // If the user is already authed when they land here (e.g. came back after a
  // partial flow), apply whatever draft we have and forward to /app.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      await applySignupAnswers({
        firstName: draft.firstName,
        role: draft.role,
        channelsPicked: draft.channelsPicked,
        dailyVolume: draft.dailyVolume,
        topPain: draft.topPain,
      });
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = "/app";
    })();
    return () => {
      cancelled = true;
    };
    // run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const idx = STEPS.indexOf(step);
  const goNext = () => {
    const next = STEPS[idx + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = STEPS[idx - 1];
    if (prev) setStep(prev);
  };

  const canNext =
    (step === "role" && !!draft.role) ||
    (step === "channels" && draft.channelsPicked.length > 0) ||
    (step === "volume" && !!draft.dailyVolume) ||
    (step === "pain" && !!draft.topPain) ||
    (step === "name" && draft.firstName.trim().length > 0);

  const finishWithSession = async () => {
    startTransition(async () => {
      await applySignupAnswers({
        firstName: draft.firstName,
        role: draft.role,
        channelsPicked: draft.channelsPicked,
        dailyVolume: draft.dailyVolume,
        topPain: draft.topPain,
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      window.location.href = "/app";
    });
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    setAuthLoading("send");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/sign-up`,
        },
      });
      if (error) throw error;
      // If email confirmation is disabled, we get a session right away.
      if (data.session) {
        await finishWithSession();
        return;
      }
      setAuthPhase("code");
      setAuthMsg({
        kind: "info",
        text: `Code envoyé à ${authEmail.trim()}.`,
      });
    } catch (err) {
      setAuthMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Inscription impossible.",
      });
    } finally {
      setAuthLoading(null);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    setAuthLoading("verify");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: authEmail.trim(),
        token: authCode.trim(),
        type: "signup",
      });
      if (error) throw error;
      await finishWithSession();
    } catch (err) {
      setAuthMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Code invalide ou expiré.",
      });
      setAuthLoading(null);
    }
  };

  const resendCode = async () => {
    setAuthMsg(null);
    setAuthLoading("send");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: authEmail.trim(),
      });
      if (error) throw error;
      setAuthMsg({ kind: "info", text: "Nouveau code envoyé." });
    } catch (err) {
      setAuthMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Renvoi impossible.",
      });
    } finally {
      setAuthLoading(null);
    }
  };

  const resetEmailPhase = () => {
    setAuthPhase("email");
    setAuthCode("");
    setAuthMsg(null);
  };

  const handleGoogle = async () => {
    setAuthMsg(null);
    setAuthLoading("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/sign-up`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setAuthMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Connexion Google impossible.",
      });
      setAuthLoading(null);
    }
  };

  if (!hydrated) {
    return (
      <div className="onb-stage">
        <header className="onb-stage-head">
          <div className="onb-mue">
            <MueAvatar />
          </div>
        </header>
        <main className="onb-stage-main" />
      </div>
    );
  }

  return (
    <div className="onb-stage">
      <header className="onb-stage-head">
        <Link href="/" className="onb-mue" aria-label="Retour à l'accueil">
          <MueAvatar />
        </Link>
        <span className="onb-step-tag">
          {step === "auth" ? "Dernière étape" : `Étape ${idx + 1} sur ${STEPS.length - 1}`}
        </span>
      </header>

      <main className="onb-stage-main">
        {step === "role" && (
          <div className="onb-body">
            <h1 className="onb-title">Quel est votre rôle ?</h1>
            <p className="onb-sub">Mue va adapter son ton en conséquence.</p>
            <div className="onb-options">
              {ROLES.map((r) => (
                <Choice
                  key={r.id}
                  active={draft.role === r.id}
                  label={r.label}
                  onClick={() => setDraft({ ...draft, role: r.id })}
                />
              ))}
            </div>
            <Actions onNext={goNext} canNext={canNext} hideBack />
          </div>
        )}

        {step === "channels" && (
          <div className="onb-body">
            <h1 className="onb-title">Quels canaux utilisez-vous chaque jour ?</h1>
            <p className="onb-sub">Choisissez-en autant que vous voulez.</p>
            <div className="onb-options">
              {CHANNELS.map((c) => (
                <Choice
                  key={c.id}
                  active={draft.channelsPicked.includes(c.id)}
                  label={c.label}
                  icon={<ChannelLogo channel={c.id as never} />}
                  onClick={() => {
                    const picked = new Set(draft.channelsPicked);
                    if (picked.has(c.id)) picked.delete(c.id);
                    else picked.add(c.id);
                    setDraft({ ...draft, channelsPicked: [...picked] });
                  }}
                  multi
                />
              ))}
            </div>
            <Actions onBack={goBack} onNext={goNext} canNext={canNext} />
          </div>
        )}

        {step === "volume" && (
          <div className="onb-body">
            <h1 className="onb-title">Combien de messages par jour, en moyenne ?</h1>
            <p className="onb-sub">Pour calibrer les suggestions de Mue.</p>
            <div className="onb-options">
              {VOLUMES.map((v) => (
                <Choice
                  key={v.id}
                  active={draft.dailyVolume === v.id}
                  label={v.label}
                  onClick={() => setDraft({ ...draft, dailyVolume: v.id })}
                />
              ))}
            </div>
            <Actions onBack={goBack} onNext={goNext} canNext={canNext} />
          </div>
        )}

        {step === "pain" && (
          <div className="onb-body">
            <h1 className="onb-title">Qu&apos;est-ce qui vous épuise le plus ?</h1>
            <p className="onb-sub">On commencera par là.</p>
            <div className="onb-options">
              {PAINS.map((p) => (
                <Choice
                  key={p.id}
                  active={draft.topPain === p.id}
                  label={p.label}
                  onClick={() => setDraft({ ...draft, topPain: p.id })}
                />
              ))}
            </div>
            <Actions onBack={goBack} onNext={goNext} canNext={canNext} />
          </div>
        )}

        {step === "name" && (
          <div className="onb-body">
            <h1 className="onb-title">Comment Mue doit-elle vous appeler ?</h1>
            <p className="onb-sub">Votre prénom suffit.</p>
            <div className="onb-form">
              <label className="onb-field">
                <span>Prénom</span>
                <input
                  type="text"
                  autoFocus
                  value={draft.firstName}
                  onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canNext) goNext();
                  }}
                  placeholder="Wacil"
                />
              </label>
            </div>
            <Actions onBack={goBack} onNext={goNext} canNext={canNext} />
          </div>
        )}

        {step === "auth" && (
          <div className="onb-body">
            {authPhase === "email" ? (
              <>
                <h1 className="onb-title">Sauvegardez votre workspace.</h1>
                <p className="onb-sub">
                  Mue a tout ce qu&apos;il faut pour démarrer. Recevez un code par email pour
                  finaliser.
                </p>

                <div className="onb-auth-providers">
                  <button
                    type="button"
                    className="onb-provider"
                    disabled={authLoading !== null || pending}
                    onClick={handleGoogle}
                  >
                    <GoogleIcon />
                    {authLoading === "google" ? "Redirection…" : "Continuer avec Google"}
                  </button>
                  <button type="button" className="onb-provider" disabled>
                    <AppleIcon />
                    Continuer avec Apple
                    <span className="onb-provider-tag">Bientôt</span>
                  </button>
                </div>

                <div className="onb-divider">
                  <span>ou</span>
                </div>

                <form className="onb-form" onSubmit={sendCode}>
                  <label className="onb-field">
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      autoFocus
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="vous@example.com"
                    />
                  </label>
                  <label className="onb-field">
                    <span>Mot de passe</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Au moins 8 caractères"
                    />
                  </label>
                  <button
                    type="submit"
                    className="onb-btn onb-btn-primary onb-btn-block"
                    disabled={
                      authLoading !== null ||
                      pending ||
                      !authEmail.includes("@") ||
                      authPassword.length < 8
                    }
                  >
                    {authLoading === "send" ? "Création…" : "Créer mon compte"}
                  </button>
                </form>

                {authMsg && (
                  <div className={`auth-msg auth-msg-${authMsg.kind}`}>{authMsg.text}</div>
                )}

                <div className="onb-actions onb-actions-between">
                  <button className="onb-btn onb-btn-quiet" type="button" onClick={goBack}>
                    Retour
                  </button>
                  <span className="onb-fine">
                    Déjà un compte ?{" "}
                    <Link href="/sign-in" className="onb-link">
                      Se connecter
                    </Link>
                  </span>
                </div>
              </>
            ) : (
              <>
                <h1 className="onb-title">Entrez votre code.</h1>
                <p className="onb-sub">
                  On vient d&apos;envoyer un code à 6 chiffres à <strong>{authEmail}</strong>. Il
                  expire dans 10 minutes.
                </p>

                <form className="onb-form onb-otp-form" onSubmit={verifyCode}>
                  <OtpInput
                    value={authCode}
                    onChange={setAuthCode}
                    onComplete={(v) => {
                      setAuthCode(v);
                      if (authLoading === null && !pending) {
                        // Auto-submit when 6 digits filled
                        requestAnimationFrame(() => {
                          const form = document.querySelector<HTMLFormElement>(".onb-otp-form");
                          form?.requestSubmit();
                        });
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="onb-btn onb-btn-primary onb-btn-block"
                    disabled={authLoading !== null || pending || authCode.length !== 6}
                  >
                    {authLoading === "verify" || pending ? "Vérification…" : "Vérifier le code"}
                  </button>
                </form>

                {authMsg && (
                  <div className={`auth-msg auth-msg-${authMsg.kind}`}>{authMsg.text}</div>
                )}

                <div className="onb-actions onb-actions-between">
                  <button className="onb-btn onb-btn-quiet" type="button" onClick={resetEmailPhase}>
                    Changer d&apos;email
                  </button>
                  <button
                    className="onb-btn onb-btn-quiet"
                    type="button"
                    onClick={resendCode}
                    disabled={authLoading !== null}
                  >
                    {authLoading === "send" ? "Envoi…" : "Renvoyer le code"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="onb-stage-foot">
        <div className="onb-progress" aria-label={`Étape ${idx + 1} sur ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`onb-dot ${i <= idx ? "is-on" : ""}`} />
          ))}
        </div>
      </footer>
    </div>
  );
}

function Choice({
  active,
  label,
  icon,
  onClick,
  multi,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button type="button" className={`onb-option ${active ? "is-active" : ""}`} onClick={onClick}>
      {icon && <span className="onb-option-logo">{icon}</span>}
      <span className="onb-option-title">{label}</span>
      <span className={`onb-option-mark ${multi ? "is-square" : ""} ${active ? "is-on" : ""}`}>
        {active && (multi ? <CheckIcon /> : <DotIcon />)}
      </span>
    </button>
  );
}

function Actions({
  onBack,
  onNext,
  canNext,
  hideBack,
}: {
  onBack?: () => void;
  onNext?: () => void;
  canNext?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div className="onb-actions">
      {hideBack ? (
        <span />
      ) : (
        <button className="onb-btn onb-btn-quiet" type="button" onClick={onBack}>
          Retour
        </button>
      )}
      <button
        className="onb-btn onb-btn-primary"
        type="button"
        onClick={onNext}
        disabled={!canNext}
      >
        Continuer
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DotIcon() {
  return <span className="onb-option-mark-dot" />;
}
