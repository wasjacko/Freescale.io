"use client";

import { Avatar } from "@/components/ui/Avatar";
import { channelProviderLabel } from "@/lib/channels/registry";
import { useApp } from "@/lib/store";
import type { Avatar as AvatarT } from "@/lib/types";
import { useEffect, useState } from "react";

type Proposed = {
  id: string;
  name: string;
  hint: string;
  avatar: AvatarT;
  /** Suggestion par défaut de Mue (client probable ou non). */
  suggested: boolean;
};

// Contacts détectés par Mue après connexion (mock). Les "probables clients"
// sont pré-cochés ; les newsletters/notifs sont proposées décochées.
const FACE = (n: number): AvatarT => ({ kind: "img", src: `/avatars/${n}.webp` });
const PROPOSED: Proposed[] = [
  {
    id: "p1",
    name: "Sarah Lemoine",
    hint: "14 échanges · aller-retours réguliers",
    avatar: FACE(1),
    suggested: true,
  },
  {
    id: "p2",
    name: "Alexandre Dupont",
    hint: "9 échanges · projet en cours",
    avatar: FACE(2),
    suggested: true,
  },
  { id: "p3", name: "Thomas Aubry", hint: "contrat en cours", avatar: FACE(4), suggested: true },
  { id: "p4", name: "Capucine Roy", hint: "devis envoyé", avatar: FACE(5), suggested: true },
  { id: "p5", name: "David Kim", hint: "6 échanges", avatar: FACE(6), suggested: true },
  {
    id: "p6",
    name: "Sophie Bernard",
    hint: "proposition validée",
    avatar: FACE(3),
    suggested: true,
  },
  {
    id: "p7",
    name: "Notion",
    hint: "notifications produit",
    avatar: { kind: "initials", text: "N", bg: "#EEE" },
    suggested: false,
  },
  {
    id: "p8",
    name: "Stripe",
    hint: "reçus de paiement",
    avatar: { kind: "initials", text: "S", bg: "#E8EAFF" },
    suggested: false,
  },
  {
    id: "p9",
    name: "LinkedIn",
    hint: "alertes réseau",
    avatar: { kind: "initials", text: "in", bg: "#E1ECFF" },
    suggested: false,
  },
];

export function ClientConfirmModal() {
  const { clientConfirm, closeClientConfirm } = useApp();
  const open = clientConfirm.open;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // À l'ouverture, pré-sélectionner les clients suggérés par Mue.
  useEffect(() => {
    if (open) setSelected(new Set(PROPOSED.filter((p) => p.suggested).map((p) => p.id)));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeClientConfirm();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeClientConfirm]);

  if (!open) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const count = selected.size;
  const label = channelProviderLabel(clientConfirm.channel);

  return (
    <div className="ccm-overlay" role="dialog" aria-modal="true" aria-label="Confirmer vos clients">
      <button
        type="button"
        className="ccm-backdrop"
        aria-hidden
        tabIndex={-1}
        onClick={closeClientConfirm}
      />
      <div className="ccm-sheet">
        <header className="ccm-head">
          <div>
            <h2 className="ccm-title">Mue a trouvé tes clients</h2>
            <p className="ccm-sub">
              Sur <b>{label}</b>, Mue a repéré {PROPOSED.filter((p) => p.suggested).length} clients
              probables. Confirme — seuls eux entreront dans ton inbox.
            </p>
          </div>
          <button
            type="button"
            className="ccm-close"
            aria-label="Fermer"
            onClick={closeClientConfirm}
          >
            ✕
          </button>
        </header>

        <div className="ccm-grid">
          {PROPOSED.map((p) => {
            const on = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`ccm-card ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(p.id)}
              >
                <Avatar avatar={{ ...p.avatar, alt: p.name }} size={36} />
                <span className="ccm-card-tx">
                  <span className="ccm-card-name">{p.name}</span>
                  <span className="ccm-card-hint">{p.hint}</span>
                </span>
                <span className={`ccm-check ${on ? "is-on" : ""}`} aria-hidden>
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="ccm-foot">
          <button type="button" className="ccm-skip" onClick={closeClientConfirm}>
            Plus tard
          </button>
          <button
            type="button"
            className="ccm-confirm"
            onClick={closeClientConfirm}
            disabled={count === 0}
          >
            Confirmer {count} client{count > 1 ? "s" : ""}
          </button>
        </footer>
      </div>
    </div>
  );
}
