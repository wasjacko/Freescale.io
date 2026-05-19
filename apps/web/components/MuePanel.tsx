"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/lib/store";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { CurrentUser } from "@/lib/auth";
import { summarizeThread, type ThreadSummary } from "@/lib/actions/mue";

type BriefState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; data: ThreadSummary }
  | { kind: "error"; message: string };

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

  // Brief / summary state — Mue's "summarize this conversation"
  // capability. Calls summarizeThread on click, shows loading then
  // displays the tldr + bullets inside a card. Reset whenever the
  // user switches conversation so a stale brief never hangs over a
  // different thread.
  const [brief, setBrief] = useState<BriefState>({ kind: "idle" });
  useEffect(() => {
    setBrief({ kind: "idle" });
  }, [activeConvId]);

  const handleBrief = async () => {
    if (!activeConvId) return;
    if (brief.kind === "loading") return;
    setBrief({ kind: "loading" });
    try {
      const res = await summarizeThread(activeConvId);
      if (res.error || !res.summary) {
        setBrief({ kind: "error", message: res.error ?? "Erreur Mue" });
      } else {
        setBrief({ kind: "result", data: res.summary });
      }
    } catch (err) {
      setBrief({
        kind: "error",
        message: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  };

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

      {/* Quick actions — Confirmer + Reporter are still placeholders
          (will wire to action detection later). "Résumer" is the first
          real Mue capability surfaced from the panel: hits summarizeThread
          and renders a brief card below. */}
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
          <button
            type="button"
            className="mue-chip mue-chip-primary"
            onClick={handleBrief}
            disabled={brief.kind === "loading"}
            aria-label="Résumer la conversation"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {brief.kind === "loading" ? "Mue lit…" : "Résumer"}
          </button>
        </div>
      )}

      {/* Brief result card — sits between the chips and the contact
          line. Renders the tldr as a small headline + the bullets
          beneath, with an × to dismiss. Loading + error states share
          the same shell so the layout doesn't jump. */}
      {brief.kind !== "idle" && conv && (
        <div className="mue-brief-card" role="region" aria-live="polite" aria-label="Brief Mue">
          <header className="mue-brief-card-head">
            <span className="mue-brief-card-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden>
                <path d="M12 3l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5L12 3z" />
              </svg>
              Brief
            </span>
            <button
              type="button"
              className="mue-brief-card-close"
              onClick={() => setBrief({ kind: "idle" })}
              aria-label="Fermer"
            >
              ✕
            </button>
          </header>

          {brief.kind === "loading" && (
            <p className="mue-brief-card-loading">
              Mue lit la conversation…
            </p>
          )}

          {brief.kind === "error" && (
            <p className="mue-brief-card-error">
              {brief.message}
            </p>
          )}

          {brief.kind === "result" && (
            <>
              <p className="mue-brief-card-tldr">{brief.data.tldr}</p>
              {brief.data.bullets.length > 0 && (
                <ul className="mue-brief-card-bullets">
                  {brief.data.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </>
          )}
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
 * MueBlob — pixel-art lavender ghost.
 *
 * Built as crisp-edges SVG with rect/path "pixels" on a 24×26 grid so
 * it scales without smoothing (CSS image-rendering: pixelated +
 * shape-rendering: crispEdges). Lavender body with a white face
 * panel, black eyes, pink cheeks, and an open pink-tongue mouth.
 *
 * `mini` renders a tiny 28×30 version used inside chat bubbles or
 * other compact contexts.
 */
function MueBlob({ mini = false }: { mini?: boolean }) {
  const size = mini ? 28 : 200;
  // The body silhouette is a single stair-stepped polygon. Each
  // change in y is exactly 1 grid-unit so the edges read as crisp
  // pixels rather than smooth curves.
  const bodyPath =
    "M 8 2 L 16 2 L 16 3 L 18 3 L 18 4 L 19 4 L 19 5 L 20 5 L 20 7 L 21 7 L 21 16 L 20 16 L 20 18 L 19 18 L 19 19 L 18 19 L 18 20 L 17 20 L 17 21 L 16 21 L 16 22 L 14 22 L 14 23 L 11 23 L 11 22 L 9 22 L 9 21 L 8 21 L 8 20 L 7 20 L 7 19 L 6 19 L 6 18 L 5 18 L 5 16 L 4 16 L 4 7 L 5 7 L 5 5 L 6 5 L 6 4 L 7 4 L 7 3 L 8 3 Z";

  return (
    <svg
      className={`mue-blob ${mini ? "is-mini" : ""}`}
      viewBox="0 0 25 26"
      width={size}
      height={mini ? 30 : Math.round(size * 1.04)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {/* Outer outline (slightly darker lavender, 1px wider on each
          side — drawn first so the body fill sits on top) */}
      <path d={bodyPath} fill="#8E89E8" />

      {/* Body fill — main lavender, 1 unit inset from the outline */}
      <path
        d="M 9 3 L 15 3 L 15 4 L 17 4 L 17 5 L 18 5 L 18 6 L 19 6 L 19 7 L 20 7 L 20 16 L 19 16 L 19 17 L 18 17 L 18 18 L 17 18 L 17 19 L 16 19 L 16 20 L 15 20 L 15 21 L 14 21 L 14 22 L 11 22 L 11 21 L 10 21 L 10 20 L 9 20 L 9 19 L 8 19 L 8 18 L 7 18 L 7 17 L 6 17 L 6 16 L 5 16 L 5 7 L 6 7 L 6 6 L 7 6 L 7 5 L 8 5 L 8 4 L 9 4 Z"
        fill="#BAB6FF"
      />

      {/* White face panel — a chunky rounded rect in the upper-center */}
      <path
        d="M 8 7 L 16 7 L 16 8 L 17 8 L 17 13 L 16 13 L 16 14 L 8 14 L 8 13 L 7 13 L 7 8 L 8 8 Z"
        fill="#FAFAFF"
      />

      {/* Subtle light highlight on the upper-left of the body */}
      <rect x="6" y="5" width="2" height="1" fill="#D9D6FF" />
      <rect x="5" y="6" width="1" height="3" fill="#D9D6FF" />

      {!mini && (
        <>
          {/* Eyes — two crisp pixel-blocks, slightly almond-leaning */}
          <rect x="9" y="9" width="2" height="3" fill="#0F0E1F" />
          <rect x="13" y="9" width="2" height="3" fill="#0F0E1F" />
          {/* Eye glints */}
          <rect x="9" y="9" width="1" height="1" fill="#FAFAFF" />
          <rect x="13" y="9" width="1" height="1" fill="#FAFAFF" />

          {/* Cheeks — small pink dots flanking the mouth */}
          <rect x="8" y="12" width="1" height="1" fill="#FFB7C9" />
          <rect x="15" y="12" width="1" height="1" fill="#FFB7C9" />

          {/* Open mouth (dark) + tongue (pink) */}
          <rect x="11" y="12" width="2" height="2" fill="#1A1620" />
          <rect x="11" y="13" width="2" height="1" fill="#FF5C84" />
        </>
      )}

      {mini && (
        <>
          {/* Mini face — eyes only */}
          <rect x="9" y="9" width="2" height="3" fill="#0F0E1F" />
          <rect x="13" y="9" width="2" height="3" fill="#0F0E1F" />
        </>
      )}
    </svg>
  );
}
