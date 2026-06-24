"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { type DailyBriefingItem, createTaskFromBrief, dailyBriefing } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { Avatar as AvatarT, ChannelId } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const Sparkle = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
  </svg>
);

// Le « raisonnement » de Mue (mock), joué pas à pas : elle lit de vrais
// extraits de messages, en déduit une action, et relie le tout. C'est ce qui
// donne l'impression qu'elle parcourt vraiment tes conversations.
type Thought =
  | { kind: "step"; text: string }
  | { kind: "msg"; contact: string; channel: ChannelId; quote: string; reason: string };

const THOUGHTS: Thought[] = [
  { kind: "step", text: "Je parcours tes conversations récentes, canal par canal…" },
  {
    kind: "msg",
    contact: "David Kim",
    channel: "whatsapp",
    quote: "Tu peux me renvoyer le devis mis à jour ? On aimerait valider cette semaine.",
    reason: "David attend une réponse de ta part.",
  },
  {
    kind: "msg",
    contact: "Sarah Lemoine",
    channel: "gmail",
    quote: "J'ai relu les maquettes, c'est tout bon pour moi. Hâte de voir la V2 !",
    reason: "Maquettes validées — il reste à livrer la V2.",
  },
  { kind: "step", text: "Je relie chaque message à tes projets en cours…" },
  {
    kind: "msg",
    contact: "Alexandre Dupont",
    channel: "slack",
    quote: "Les temps de réponse de l'API sont encore élevés en prod, on en parle ?",
    reason: "Sujet technique laissé sans réponse.",
  },
  { kind: "step", text: "Je garde seulement ce qui attend vraiment une action de ta part…" },
];

// Mélange (révélation aléatoire des tâches une à une).
function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.v);
}

/** Construit un Avatar exploitable depuis l'item (url → image, sinon initiales). */
function avatarFor(it: DailyBriefingItem): AvatarT {
  const url = it.avatars?.[0]?.url;
  if (url) return { kind: "img", src: url, alt: it.contactName };
  const initials =
    it.contactName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return { kind: "initials", text: initials, bg: "#E8EAFF" };
}

type Phase = "think" | "result" | "empty" | "error";

/**
 * MueTaskScanner — flux « Suggérer des tâches » dans le panneau Mue.
 *
 *   1. Réflexion : Mue lit tes messages (extraits réels) et raisonne à voix
 *      haute — un fil de pensées qui se construit ligne par ligne.
 *   2. Résultat : les tâches déduites partent de squelettes pastel puis se
 *      révèlent une à une, dans un ordre aléatoire.
 *
 * Ajouter une tâche = optimiste sur le dashboard. 100% UI mock.
 */
export function MueTaskScanner({
  onClose,
  inline = false,
}: {
  onClose?: () => void;
  inline?: boolean;
}) {
  const push = useToast((s) => s.push);
  const { addTask, conversations } = useData();
  const [phase, setPhase] = useState<Phase>("think");
  const [items, setItems] = useState<DailyBriefingItem[]>([]);
  const [thoughtCount, setThoughtCount] = useState(0);
  const [revealOrder, setRevealOrder] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [created, setCreated] = useState<Set<string>>(() => new Set());

  // Phase de réflexion : on déroule les pensées une à une, pendant que Mue
  // récupère réellement le briefing en arrière-plan.
  useEffect(() => {
    let cancelled = false;
    setPhase("think");
    setItems([]);
    setThoughtCount(0);
    setRevealOrder([]);
    setRevealed(new Set());
    setCreated(new Set());

    const briefingPromise = dailyBriefing();
    const STEP = 1450;
    let timer = 0;
    let i = 0;
    const advance = () => {
      if (cancelled) return;
      i += 1;
      setThoughtCount(i);
      if (i < THOUGHTS.length) {
        timer = window.setTimeout(advance, STEP);
        return;
      }
      void (async () => {
        let b: Awaited<typeof briefingPromise>;
        try {
          b = await briefingPromise;
        } catch {
          if (!cancelled) setPhase("error");
          return;
        }
        if (cancelled) return;
        if (!b.briefing || b.error) return setPhase("error");
        if (b.briefing.items.length === 0) return setPhase("empty");
        const list = b.briefing.items;
        setItems(list);
        setRevealOrder(shuffle(list.map((_, idx) => idx)));
        setPhase("result");
      })();
    };
    timer = window.setTimeout(advance, STEP);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Phase résultat : skeletons d'abord, puis chaque tâche se révèle (ordre
  // aléatoire, tempo irrégulier) en remplaçant son squelette.
  useEffect(() => {
    if (phase !== "result" || items.length === 0) return;
    let cancelled = false;
    let timer = 0;
    let k = 0;
    const revealNext = () => {
      if (cancelled) return;
      const idx = revealOrder[k];
      k += 1;
      if (idx !== undefined) {
        setRevealed((prev) => {
          const n = new Set(prev);
          n.add(idx);
          return n;
        });
      }
      if (k < revealOrder.length) timer = window.setTimeout(revealNext, 360 + Math.random() * 360);
    };
    timer = window.setTimeout(revealNext, 1200); // moment squelette (visible) avant la révélation
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase, items.length, revealOrder]);

  // Auto-scroll du fil de pensées vers le bas à chaque nouvelle ligne.
  const logRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el && thoughtCount > 0) el.scrollTop = el.scrollHeight;
  }, [thoughtCount]);

  useEffect(() => {
    if (inline) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, inline]);

  const addOne = (item: DailyBriefingItem) => {
    const id = item.conversationId;
    if (created.has(id)) return;
    const conv = conversations.find((c) => c.id === id);
    addTask({
      id: `sug-${id}`,
      title: item.title,
      priority: item.priority,
      dueLabel: item.timeAgo ?? "À faire",
      status: "todo",
      avatar: conv?.avatar ?? avatarFor(item),
      channel: conv?.channel ?? "gmail",
      sortableIndex: Date.now(),
      fromAI: true,
      conversationId: id,
    });
    setCreated((c) => new Set(c).add(id));
    void createTaskFromBrief({
      conversationId: id,
      title: item.title,
      description: item.why,
      priority: item.priority,
      due: item.due,
    })
      .then((res) => {
        if (!res.ok) push({ kind: "error", text: res.error ?? "Création impossible." });
      })
      .catch(() => push({ kind: "error", text: "Création impossible." }));
  };

  const addAll = () => {
    for (const it of items) addOne(it);
    push({ kind: "info", text: "Tâches ajoutées ✨", duration: 2400 });
  };

  const remaining = items.filter((it) => !created.has(it.conversationId)).length;
  const allRevealed = revealed.size >= items.length;

  return (
    <div className={`tscan ${inline ? "tscan--inline" : ""}`}>
      {!inline && (
        <header className="tscan-head">
          <span className="tscan-badge">
            <Sparkle size={12} /> Mue
          </span>
          <button type="button" className="tscan-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
      )}

      {phase === "think" && (
        <div className="tscan-result">
          <div className="tscan-title">
            <h2 className="tscan-loading">
              <span className="tscan-ministar" aria-hidden /> Mue lit tes messages…
            </h2>
            <p>Sur tous tes canaux — Gmail, WhatsApp, Slack, LinkedIn</p>
          </div>

          <ul className="tthink" ref={logRef} aria-live="polite">
            {THOUGHTS.slice(0, thoughtCount).map((t, i) => {
              const active = i === thoughtCount - 1;
              if (t.kind === "step") {
                return (
                  <li key={t.text} className={`tthink-step ${active ? "is-active" : ""}`}>
                    <span className="tthink-spark" aria-hidden>
                      ✦
                    </span>
                    {t.text}
                  </li>
                );
              }
              return (
                <li key={t.contact} className={`tthink-msg ${active ? "is-active" : ""}`}>
                  <div className="tthink-msg-head">
                    <ChannelLogo channel={t.channel} className="tthink-ch" />
                    <span className="tthink-name">{t.contact}</span>
                  </div>
                  <p className="tthink-quote">« {t.quote} »</p>
                  <p className="tthink-reason">
                    <span className="tthink-arrow" aria-hidden>
                      →
                    </span>
                    {t.reason}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {phase === "result" && (
        <div className="tscan-result">
          <div className="tscan-title">
            <h2>
              {items.length} tâche{items.length > 1 ? "s" : ""} détectée
              {items.length > 1 ? "s" : ""}
            </h2>
            <p>Déduites de tes conversations récentes</p>
          </div>

          <ul className="tscan-list">
            {items.map((it, i) => {
              if (!revealed.has(i)) {
                return (
                  <li key={`skel-${it.conversationId}`} className="skel-card">
                    <div className="skel-card-top">
                      <span className="skel-dot" />
                      <span className="skel-bar skel-bar--sm" />
                    </div>
                    <span className="skel-bar skel-bar--lg" />
                  </li>
                );
              }
              const done = created.has(it.conversationId);
              return (
                <li key={it.conversationId} className={`tscan-card ${done ? "is-done" : ""}`}>
                  <div className="tscan-card-top">
                    <Avatar avatar={avatarFor(it)} size={20} className="tscan-card-av" />
                    <span className="tscan-card-client">{it.contactName}</span>
                    <button
                      type="button"
                      className={`tscan-add ${done ? "is-done" : ""}`}
                      onClick={() => addOne(it)}
                      disabled={done}
                      aria-label={done ? "Tâche ajoutée" : "Ajouter la tâche"}
                      title={done ? "Ajoutée" : "Ajouter"}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={13}
                        height={13}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        {done ? (
                          <polyline points="20 6 9 17 4 12" />
                        ) : (
                          <>
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                  <p className="tscan-card-title">{it.title}</p>
                </li>
              );
            })}
          </ul>

          {allRevealed && (
            <footer className="tscan-foot">
              <button
                type="button"
                className="tscan-addall"
                onClick={addAll}
                disabled={remaining === 0}
              >
                {remaining === 0 ? "Tout est ajouté ✓" : `Tout ajouter (${remaining})`}
              </button>
              {!inline && (
                <button type="button" className="tscan-donebtn" onClick={onClose}>
                  Terminé
                </button>
              )}
            </footer>
          )}
        </div>
      )}

      {phase === "empty" && (
        <div className="tscan-state">
          <span className="tscan-state-orb">
            <Sparkle size={22} />
          </span>
          <h2>Tout est calme ✨</h2>
          <p>Mue ne voit rien d'urgent à transformer en tâche.</p>
          <button type="button" className="tscan-donebtn" onClick={onClose}>
            Fermer
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="tscan-state">
          <h2>Mue est indisponible</h2>
          <p>Réessaie dans un instant.</p>
          <button type="button" className="tscan-donebtn" onClick={onClose}>
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
