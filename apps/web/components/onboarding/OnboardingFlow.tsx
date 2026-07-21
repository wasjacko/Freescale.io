"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { MueFlower } from "@/components/MueFlower";
import { channelProviderLabel } from "@/lib/channels/registry";
import type { ChannelId } from "@/lib/types";
import { useEffect, useState } from "react";

/**
 * OnboardingFlow — le parcours de premier lancement complet, tel que défini
 * avec le skill « user-onboarding » (auth d'abord → connexion → sync avec
 * micro-récompense Mue → aha → 1re action → profiling soft APRÈS la valeur).
 *
 * Entièrement aligné sur les styles .onb- de globals.css.
 */

type Step = "connect" | "sync" | "aha" | "action" | "profile";
const STEPS: Step[] = ["connect", "sync", "aha", "action", "profile"];

const ROLE_OPTIONS = ["Designer", "Product Manager", "Developer", "Marketing", "Founder", "Autre"];
const OBJECTIVE_OPTIONS = [
  { value: "ne-rien-rater", label: "Ne rien rater" },
  { value: "tasks", label: "Transformer en tâches" },
  { value: "inbox-zero", label: "Vider l'inbox" },
  { value: "clients", label: "Suivre les clients" },
];

const SYNC_STAGES = [
  "Connexion sécurisée…",
  "Récupération de vos derniers messages…",
  "Regroupement des conversations…",
  "Mue prépare votre inbox…",
];

export function OnboardingFlow({
  firstName: _firstName = "Wacil",
  onFinish,
  onConnect,
}: {
  firstName?: string;
  onFinish?: (answers?: { role: string | null; objective: string | null }) => void;
  onConnect?: (kind: ChannelId) => void;
}) {
  const [step, setStep] = useState<Step>("connect");
  const [picked, setPicked] = useState<ChannelId>("gmail");
  const [role, setRole] = useState<string | null>(null);
  const [objective, setObjective] = useState<string | null>(null);

  const idx = STEPS.indexOf(step);
  const go = (s: Step) => setStep(s);

  return (
    <div className="onb-page">
      <div className="onb-stage">
        {/* Header */}
        <header className="onb-stage-head">
          <div className="onb-mue">
            <MueFlower size={32} />
          </div>
          <span className="onb-step-tag">
            Étape {idx + 1} sur {STEPS.length}
          </span>
        </header>

        {/* Main Step Container */}
        <main className="onb-stage-main">
          {step === "connect" && (
            <ConnectStep
              picked={picked}
              onPick={setPicked}
              onConnect={() => {
                onConnect?.(picked);
                go("sync");
              }}
            />
          )}

          {step === "sync" && <SyncStep channel={picked} onDone={() => go("aha")} />}

          {step === "aha" && <AhaStep onNext={() => go("action")} />}

          {step === "action" && <ActionStep onNext={() => go("profile")} />}

          {step === "profile" && (
            <ProfileStep
              role={role}
              objective={objective}
              onRole={setRole}
              onObjective={setObjective}
              onFinish={(answers) => onFinish?.(answers)}
            />
          )}
        </main>

        {/* Footer with progress dots */}
        <footer className="onb-stage-foot">
          <div className="onb-progress" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={`onb-dot ${i <= idx ? "is-on" : ""}`} />
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────────── Étape 1 — Connexion au compte ───────────────────────── */
function AppleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
      style={{ color: "#000000" }}
    >
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
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ color: "#4f6cf7" }}
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

const ONBOARDING_AUTH_PROVIDERS = [
  { kind: "gmail" as ChannelId, label: "Google (Gmail)" },
  { kind: "icloud" as ChannelId, label: "Apple" },
  { kind: "imap" as ChannelId, label: "Adresse e-mail" },
] as const;

function ConnectStep({
  picked,
  onPick,
  onConnect,
}: {
  picked: ChannelId;
  onPick: (k: ChannelId) => void;
  onConnect: () => void;
}) {
  const currentProvider = ONBOARDING_AUTH_PROVIDERS.find((p) => p.kind === picked);
  const currentLabel = currentProvider ? currentProvider.label : "compte";

  return (
    <div className="onb-body">
      <h1 className="onb-title">Comment souhaites-tu te connecter ?</h1>
      <p className="onb-sub">
        Crée ton compte Freescale ou connecte-toi avec Google, Apple ou ton adresse e-mail.
      </p>
      <div className="onb-options" style={{ marginTop: "12px" }}>
        {ONBOARDING_AUTH_PROVIDERS.map((p) => {
          const on = picked === p.kind;
          return (
            <button
              key={p.kind}
              type="button"
              className={`onb-option ${on ? "is-active" : ""}`}
              onClick={() => onPick(p.kind)}
              aria-pressed={on}
            >
              <span
                className="onb-option-logo"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                {p.kind === "gmail" && <ChannelLogo channel="gmail" />}
                {p.kind === "icloud" && <AppleIcon />}
                {p.kind === "imap" && <MailIcon />}
              </span>
              <span className="onb-option-title" style={{ marginLeft: "8px" }}>
                {p.label}
              </span>
              <span className="onb-option-tag is-ready">Actif</span>
            </button>
          );
        })}
      </div>
      <div className="onb-actions" style={{ marginTop: "12px" }}>
        <button
          type="button"
          className="onb-btn onb-btn-primary"
          style={{ width: "100%" }}
          onClick={onConnect}
        >
          Se connecter avec {currentLabel}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────── Étape 3 — Sync + micro-récompense ───────────────────── */
function SyncStep({ channel, onDone }: { channel: ChannelId; onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (stage < SYNC_STAGES.length) {
      const t = setTimeout(() => setStage((s) => s + 1), 1200);
      return () => clearTimeout(t);
    }
    setDone(true);
  }, [stage]);

  return (
    <div className="onb-body" style={{ textAlign: "center" }}>
      <div
        className="onb-mue"
        style={{ margin: "0 auto 16px", display: "grid", placeItems: "center" }}
      >
        <MueFlower size={64} animated />
      </div>
      {!done ? (
        <>
          <h1 className="onb-title">Je récupère tes messages…</h1>
          <div
            className="onb-sync-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "20px",
              textAlign: "left",
              background: "rgba(15, 23, 42, 0.02)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid rgba(15, 23, 42, 0.05)",
            }}
          >
            {SYNC_STAGES.map((label, i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "13px",
                  color: i === stage ? "#0f172a" : i < stage ? "#16a34a" : "#94a3b8",
                  fontWeight: i === stage ? "600" : "500",
                  opacity: i > stage ? 0.5 : 1,
                  transition: "all 300ms var(--ease)",
                }}
              >
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: i <= stage ? "none" : "2px solid rgba(15, 23, 42, 0.15)",
                    background: i < stage ? "#16a34a" : i === stage ? "#4f6cf7" : "transparent",
                    display: "inline-grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: "bold",
                    boxShadow: i === stage ? "0 0 0 4px rgba(79, 108, 247, 0.18)" : "none",
                  }}
                >
                  {i < stage ? "✓" : i === stage ? "●" : ""}
                </span>
                {label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="onb-title">C'est prêt.</h1>
          <p className="onb-sub" style={{ marginTop: "10px" }}>
            J'ai regroupé <strong>47 messages</strong> en <strong>12 conversations</strong>, et
            repéré <strong>3 clients</strong> dans ton {channelProviderLabel(channel)}.
          </p>
          <div className="onb-actions onb-actions-end" style={{ marginTop: "24px" }}>
            <button
              type="button"
              className="onb-btn onb-btn-primary"
              style={{ width: "100%" }}
              onClick={onDone}
            >
              Voir mon inbox
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Étape 4 — Aha ─────────────────────────── */
function AhaStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="onb-body" style={{ textAlign: "center" }}>
      <div
        className="onb-aha-mock"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "16px",
          background: "rgba(15, 23, 42, 0.03)",
          borderRadius: "12px",
          marginBottom: "24px",
          width: "100%",
          maxWidth: "340px",
          margin: "0 auto 24px",
        }}
      >
        <div
          style={{
            height: "12px",
            background: "rgba(15,23,42,0.06)",
            borderRadius: "6px",
            width: "70%",
          }}
        />
        <div
          style={{
            height: "12px",
            background: "rgba(15,23,42,0.04)",
            borderRadius: "6px",
            width: "90%",
          }}
        />
        <div
          style={{
            height: "12px",
            background: "rgba(15,23,42,0.05)",
            borderRadius: "6px",
            width: "50%",
          }}
        />
      </div>
      <h1 className="onb-title">Voilà ton inbox unifiée</h1>
      <p className="onb-sub">
        Tous tes canaux, une seule liste. Fini le passage d'une app à l'autre.
      </p>
      <div className="onb-actions onb-actions-end" style={{ marginTop: "16px" }}>
        <button
          type="button"
          className="onb-btn onb-btn-primary"
          style={{ width: "100%" }}
          onClick={onNext}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

/* ──────────────────── Étape 5 — Première action guidée ──────────────────── */
function ActionStep({ onNext }: { onNext: () => void }) {
  const actions = [
    { icon: "✦", title: "Trier ma boîte avec Mue", sub: "Je range tout par onglets" },
    { icon: "☀", title: "Le brief du jour", sub: "Ce qui mérite ton attention" },
    { icon: "→", title: "Explorer par moi-même", sub: "Je te laisse la main" },
  ];
  return (
    <div className="onb-body">
      <h1 className="onb-title">Par où on commence ?</h1>
      <p className="onb-sub">Choisis une première action. Tu pourras toujours changer d'avis.</p>
      <div className="onb-options" style={{ marginTop: "12px" }}>
        {actions.map((a) => (
          <button
            key={a.title}
            type="button"
            className="onb-option"
            onClick={onNext}
            style={{ display: "flex", gap: "16px", padding: "16px 20px" }}
          >
            <span
              style={{
                fontSize: "20px",
                width: "24px",
                height: "24px",
                display: "grid",
                placeItems: "center",
              }}
            >
              {a.icon}
            </span>
            <div>
              <div className="onb-option-title" style={{ fontSize: "14px", fontWeight: "600" }}>
                {a.title}
              </div>
              <div
                className="onb-option-desc"
                style={{ fontSize: "12px", color: "#5b6475", marginTop: "2px" }}
              >
                {a.sub}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── Étape 6 — Profiling soft (après valeur) ─────────────────── */
function ProfileStep({
  role,
  objective,
  onRole,
  onObjective,
  onFinish,
}: {
  role: string | null;
  objective: string | null;
  onRole: (r: string) => void;
  onObjective: (o: string) => void;
  onFinish: (answers?: { role: string | null; objective: string | null }) => void;
}) {
  return (
    <div className="onb-body">
      <h1 className="onb-title">Une dernière chose (optionnel)</h1>
      <p className="onb-sub">
        Deux réponses pour que j'adapte mes suggestions à ta façon de travailler.
      </p>

      <div className="onb-field" style={{ marginTop: "10px" }}>
        <span>Ton rôle</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`onb-chip ${role === r ? "is-active" : ""}`}
              onClick={() => onRole(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="onb-field" style={{ marginTop: "14px" }}>
        <span>Ton objectif</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
          {OBJECTIVE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`onb-chip ${objective === o.value ? "is-active" : ""}`}
              onClick={() => onObjective(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="onb-actions" style={{ marginTop: "24px", justifyContent: "space-between" }}>
        <button type="button" className="onb-btn" onClick={() => onFinish()}>
          Plus tard
        </button>
        <button
          type="button"
          className="onb-btn onb-btn-primary"
          onClick={() => onFinish({ role, objective })}
        >
          Terminer
        </button>
      </div>
    </div>
  );
}
