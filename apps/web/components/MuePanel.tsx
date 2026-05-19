"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { CurrentUser } from "@/lib/auth";

/**
 * MuePanel — companion-style AI panel.
 *
 * Visual: a cute peach blob mascot at the top with eyes + a smile and
 * floating particles, then a headline tailored to the active
 * conversation, two quick-action chips, a quiet contact line, a tiny
 * 2-bubble chat history, and an "Ask Mue" input at the bottom.
 *
 * The blob is pure SVG (radial gradients + organic path) so it scales
 * crisply and animates via CSS keyframes — no Lottie or images.
 *
 * Mue's content is mocked for now (matched to the active conv when
 * possible). Wiring to real Mue logic (summary/actions/follow-ups) is
 * a follow-up — this pass nails the visual character.
 */
export function MuePanel(_props: { user?: CurrentUser | null }) {
  const { activeConvId } = useApp();
  const { conversations } = useData();
  const push = useToast((s) => s.push);
  const [askInput, setAskInput] = useState("");

  const conv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );
  const firstName = conv?.name.split(/[ –-]/)[0]?.trim() ?? "ton contact";

  // Count other convs with the same contact (cross-thread context)
  const sameContactCount = useMemo(() => {
    if (!conv) return 0;
    return conversations.filter((c) => c.name === conv.name).length;
  }, [conversations, conv]);

  const handleAction = (label: string) => {
    push({ kind: "info", text: `${label} — bientôt branché à Mue` });
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    push({ kind: "info", text: "Mue te répond bientôt — wired soon" });
    setAskInput("");
  };

  return (
    <aside className="copilot mue-pane" aria-label="Mue copilot">
      {/* Stage — the blob mascot, its glow, and floating particles */}
      <div className="mue-stage" aria-hidden>
        <div className="mue-glow" />
        <div className="mue-particles">
          <span className="mue-particle mue-p1" />
          <span className="mue-particle mue-p2" />
          <span className="mue-particle mue-p3" />
          <span className="mue-particle mue-p4" />
          <span className="mue-particle mue-p5" />
          <span className="mue-particle mue-p6" />
        </div>
        <MueBlob />
      </div>

      {/* Headline — Mue's voice, tailored to the active conv */}
      <h2 className="mue-headline">
        {conv
          ? `${firstName} veut une démo lundi. Tu confirmes ?`
          : "Sélectionne une conversation, je regarde avec toi."}
      </h2>

      {/* Two quick actions */}
      {conv && (
        <div className="mue-chips" role="group" aria-label="Actions rapides">
          <button
            type="button"
            className="mue-chip"
            onClick={() => handleAction("Confirmer")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Confirmer
          </button>
          <button
            type="button"
            className="mue-chip"
            onClick={() => handleAction("Reporter")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 16 14" />
            </svg>
            Reporter
          </button>
        </div>
      )}

      {/* Quiet contact line */}
      {conv && (
        <p className="mue-contact-line">
          {sameContactCount} conversation{sameContactCount > 1 ? "s" : ""} avec{" "}
          {firstName} · répond en 4h
        </p>
      )}

      {/* Ask input */}
      <form className="mue-ask-form" onSubmit={handleAsk}>
        <input
          type="text"
          className="mue-ask-input"
          placeholder="Demande à Mue..."
          value={askInput}
          onChange={(e) => setAskInput(e.target.value)}
          aria-label="Demander à Mue"
        />
        <button
          type="submit"
          className="mue-ask-send"
          aria-label="Envoyer"
          disabled={!askInput.trim()}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </aside>
  );
}

/**
 * MueBlob — the cute peach blob mascot.
 *
 * The shape is a hand-tuned organic path (slightly asymmetric "fat
 * droplet" with a soft top). A radial gradient gives the dimensional
 * peach tone; a smaller white ellipse at the top-left is the specular
 * highlight; two black almond-shaped eyes + a single curve = the face.
 *
 * `mini` renders a 28×26 inline avatar (used inside chat bubbles).
 */
function MueBlob({ mini = false }: { mini?: boolean }) {
  const size = mini ? 28 : 200;
  return (
    <svg
      className={`mue-blob ${mini ? "is-mini" : ""}`}
      viewBox="0 0 220 200"
      width={size}
      height={mini ? 26 : Math.round(size * 0.91)}
      aria-hidden
    >
      <defs>
        <radialGradient id={mini ? "mueBodyMini" : "mueBody"} cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#FFE3CA" />
          <stop offset="35%" stopColor="#FFC299" />
          <stop offset="72%" stopColor="#F49B6A" />
          <stop offset="100%" stopColor="#E37A4A" />
        </radialGradient>
        <radialGradient id={mini ? "mueHighlightMini" : "mueHighlight"} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Body — organic droplet shape, slightly asymmetric */}
      <path
        d="
          M 110,18
          C 156,18  198,52  198,108
          C 198,156 162,184 110,184
          C 58,184   24,156  24,108
          C 24,62    62,18  110,18
          Z
        "
        fill={`url(#${mini ? "mueBodyMini" : "mueBody"})`}
      />

      {/* Top-left specular highlight */}
      <ellipse
        cx="78"
        cy="62"
        rx="36"
        ry="22"
        fill={`url(#${mini ? "mueHighlightMini" : "mueHighlight"})`}
        transform="rotate(-22 78 62)"
      />

      {!mini && (
        <>
          {/* Tiny top sparkle */}
          <ellipse cx="105" cy="38" rx="6" ry="3" fill="rgba(255,255,255,0.55)" transform="rotate(-15 105 38)" />

          {/* Eyes — two soft almond-shaped pupils */}
          <ellipse cx="86" cy="108" rx="6" ry="9" fill="#1C1B2C" />
          <ellipse cx="134" cy="108" rx="6" ry="9" fill="#1C1B2C" />
          {/* Eye glints (catch light) */}
          <circle cx="88" cy="103" r="1.6" fill="rgba(255,255,255,0.9)" />
          <circle cx="136" cy="103" r="1.6" fill="rgba(255,255,255,0.9)" />

          {/* Smile — gentle curve */}
          <path
            d="M 96,132 Q 110,142 124,132"
            fill="none"
            stroke="#1C1B2C"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}

      {mini && (
        <>
          {/* Mini eyes only — too small for full face */}
          <circle cx="90" cy="115" r="9" fill="#1C1B2C" />
          <circle cx="130" cy="115" r="9" fill="#1C1B2C" />
        </>
      )}
    </svg>
  );
}
