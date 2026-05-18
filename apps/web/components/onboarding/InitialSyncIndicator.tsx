"use client";

import { useEffect, useState } from "react";

/**
 * Honest progress indicator shown above the inbox while the user's
 * FIRST inbox sync is running. Audit-driven: silent skeletons are
 * fine for a refresh, but on first connection the user has zero
 * context and a ~15s blank state feels like the app is broken.
 *
 * Visible only when:
 *   - the user has at least 1 channel connected, AND
 *   - the inbox is empty, AND
 *   - the global isSyncing flag is true
 *
 * Inbox.tsx is the only caller and owns that gating logic. This
 * component just renders the visual and rotates a friendly status
 * line so the user feels the system is making progress.
 */

const STAGES = [
  { label: "Connexion sécurisée à Gmail…", durationMs: 2200 },
  { label: "Récupération de vos derniers messages…", durationMs: 5000 },
  { label: "Regroupement des conversations…", durationMs: 4000 },
  { label: "Mue prépare votre inbox…", durationMs: 6000 },
  { label: "Bientôt prêt…", durationMs: 8000 },
];

export function InitialSyncIndicator() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const t = setTimeout(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      STAGES[stage]?.durationMs ?? 4000
    );
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="initial-sync" aria-live="polite" aria-busy="true">
      <div className="initial-sync-orb">
        <span className="initial-sync-pulse" />
        <span className="initial-sync-pulse" />
        <span className="initial-sync-core" />
      </div>
      <div className="initial-sync-text">
        <div className="initial-sync-title">{STAGES[stage]?.label}</div>
        <div className="initial-sync-sub">
          Vous pouvez patienter ici, ça prend généralement entre 10 et 30 secondes.
        </div>
      </div>
    </div>
  );
}
