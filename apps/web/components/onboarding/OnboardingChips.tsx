"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/useToast";
import {
  saveOnboardingAnswers,
  dismissOnboarding,
} from "@/lib/actions/onboarding";

/**
 * Soft profiling card shown at the top of the inbox for first-time
 * users (profile.onboarded_at IS NULL). Three chip-row questions, all
 * optional. Audit-aligned: collect AFTER first value, never before.
 *
 * Layout: a single non-blocking card with three short questions visible
 * at once (no wizard step-through). Users can answer any subset, click
 * "Terminer" to save what they picked + mark onboarded, or "Plus tard"
 * to dismiss without answering. Either path → card never reappears.
 *
 * The page can hide the whole thing optimistically when the user acts —
 * we don't wait for the server roundtrip.
 */

const ROLE_OPTIONS = ["Designer", "Product Manager", "Developer", "Marketing", "Founder", "Autre"];
const OBJECTIVE_OPTIONS = [
  { value: "ne-rien-rater", label: "Ne rien rater" },
  { value: "tasks", label: "Transformer en tâches" },
  { value: "inbox-zero", label: "Vider l'inbox" },
  { value: "clients", label: "Suivre les clients" },
];
const USAGE_OPTIONS = [
  { value: "solo", label: "Solo" },
  { value: "multi-inbox", label: "Plusieurs boîtes" },
  { value: "team", label: "Avec une équipe" },
];

export function OnboardingChips({
  initialRole,
  initialObjective,
  initialUsageMode,
}: {
  initialRole?: string | null;
  initialObjective?: string | null;
  initialUsageMode?: string | null;
}) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [role, setRole] = useState<string | null>(initialRole ?? null);
  const [objective, setObjective] = useState<string | null>(initialObjective ?? null);
  const [usageMode, setUsageMode] = useState<string | null>(initialUsageMode ?? null);
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (dismissed) return null;

  const hasAnyAnswer = !!(role || objective || usageMode);

  const handleSave = () => {
    setDismissed(true);
    startTransition(async () => {
      const res = await saveOnboardingAnswers({
        role,
        objective,
        usageMode,
      });
      if (!res.ok) {
        push({ text: `Erreur : ${res.error}`, duration: 4000 });
        setDismissed(false);
        return;
      }
      push({ text: "Merci, Mue personnalisera vos suggestions.", duration: 2400 });
      router.refresh();
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    startTransition(async () => {
      const res = await dismissOnboarding();
      if (!res.ok) {
        setDismissed(false);
        push({ text: `Erreur : ${res.error}`, duration: 4000 });
      } else {
        router.refresh();
      }
    });
  };

  return (
    <section className="onb-chips" aria-label="Profilage rapide">
      <header className="onb-chips-head">
        <div>
          <h3 className="onb-chips-title">Aidez Mue à mieux vous comprendre</h3>
          <p className="onb-chips-sub">3 questions rapides, toutes optionnelles.</p>
        </div>
        <button
          type="button"
          className="onb-chips-close"
          onClick={handleDismiss}
          disabled={pending}
          aria-label="Fermer"
        >
          ✕
        </button>
      </header>

      <div className="onb-chips-row">
        <label className="onb-chips-label">Vous êtes plutôt…?</label>
        <div className="onb-chips-options">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`onb-chip ${role === opt ? "is-active" : ""}`}
              onClick={() => setRole(role === opt ? null : opt)}
              disabled={pending}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="onb-chips-row">
        <label className="onb-chips-label">Votre priorité ?</label>
        <div className="onb-chips-options">
          {OBJECTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`onb-chip ${objective === opt.value ? "is-active" : ""}`}
              onClick={() => setObjective(objective === opt.value ? null : opt.value)}
              disabled={pending}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="onb-chips-row">
        <label className="onb-chips-label">Votre setup ?</label>
        <div className="onb-chips-options">
          {USAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`onb-chip ${usageMode === opt.value ? "is-active" : ""}`}
              onClick={() => setUsageMode(usageMode === opt.value ? null : opt.value)}
              disabled={pending}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="onb-chips-actions">
        <button
          type="button"
          className="onb-chips-skip"
          onClick={handleDismiss}
          disabled={pending}
        >
          Plus tard
        </button>
        <button
          type="button"
          className="onb-chips-save"
          onClick={handleSave}
          disabled={pending || !hasAnyAnswer}
        >
          {pending ? "Enregistrement…" : "Terminer"}
        </button>
      </div>
    </section>
  );
}
