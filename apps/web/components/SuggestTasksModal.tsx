"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { type DailyBriefingItem, createTaskFromBrief, dailyBriefing } from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import type { Task } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const Sparkle = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7L12 2.5z" />
  </svg>
);

const THINKING_STEPS = [
  "Mue scanne tes derniers messages…",
  "Repère ce qui attend une action…",
  "Prépare tes suggestions de tâches…",
];

function priorityLabel(p: DailyBriefingItem["priority"]) {
  if (p === "high") return "Prioritaire";
  if (p === "low") return "À surveiller";
  return "À traiter";
}

function buildTaskFromItem(item: DailyBriefingItem): Task {
  const initials =
    item.contactName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const dueLabel = item.due
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
        new Date(item.due)
      )
    : "À faire";
  return {
    id: `sug-${item.conversationId}`,
    title: item.title,
    priority: item.priority,
    dueLabel,
    status: "todo",
    avatar: item.avatars?.[0]
      ? (item.avatars[0] as Task["avatar"])
      : { kind: "initials" as const, text: initials, bg: "#E8EAFF" },
    channel: "gmail",
    sortableIndex: Date.now(),
  };
}

type Phase = "thinking" | "result" | "empty" | "error";

/**
 * SuggestTasksModal — l'expérience "wow" déclenchée par « Suggérer de
 * nouvelles tâches ». Mue réfléchit (orbe animée + messages), puis révèle
 * des suggestions en cascade. Ajouter une suggestion alimente EN DIRECT la
 * liste de tâches prioritaires du dashboard (ajout optimiste).
 */
/**
 * MueTaskScanner — l'expérience "wow" de détection de tâches intégrée au
 * panneau latéral droit de Mue. Mue réfléchit (orbe animée + messages), puis
 * révèle des suggestions en cascade. Ajouter une suggestion alimente EN DIRECT
 * la liste de tâches prioritaires du dashboard (ajout optimiste).
 */
export function MueTaskScanner({
  onClose,
}: {
  onClose: () => void;
}) {
  const push = useToast((s) => s.push);
  const { addTask, conversations } = useData();
  const [phase, setPhase] = useState<Phase>("thinking");

  // Cartes de messages affichées dans le scan (vrais derniers messages, triés
  // du plus récent au plus ancien). Dupliquées pour un défilement en boucle.
  const scanCards = useMemo(
    () =>
      [...(conversations ?? [])]
        .sort((a, b) => new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime())
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          name: c.name,
          preview: c.preview,
          channel: c.channel,
          avatar: c.avatar,
        })),
    [conversations]
  );
  // Carte en cours de scan : on en sélectionne une, on défile, on passe à la
  // suivante. L'indice avance régulièrement pendant la phase « thinking ».
  const [scanIdx, setScanIdx] = useState(0);
  const [items, setItems] = useState<DailyBriefingItem[]>([]);
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<Set<string>>(new Set());

  // Lance le flux au montage : Mue "réfléchit" (min 1.9s), puis on révèle.
  useEffect(() => {
    let cancelled = false;
    setPhase("thinking");
    setItems([]);
    setStep(0);
    setCreated(new Set());

    const cycle = setInterval(() => {
      if (!cancelled) setStep((s) => (s + 1) % THINKING_STEPS.length);
    }, 900);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    void (async () => {
      try {
        const [res] = await Promise.all([dailyBriefing(), sleep(6000)]);
        if (cancelled) return;
        if (!res.briefing || res.error) {
          setPhase("error");
          return;
        }
        if (res.briefing.items.length === 0) {
          setPhase("empty");
          return;
        }
        setItems(res.briefing.items);
        setPhase("result");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(cycle);
    };
  }, []);

  // Avance la sélection de carte pendant le scan (une carte ~ toutes les 1.2s).
  useEffect(() => {
    if (phase !== "thinking" || scanCards.length === 0) return;
    setScanIdx(0);
    const id = setInterval(() => setScanIdx((i) => i + 1), 1200);
    return () => clearInterval(id);
  }, [phase, scanCards.length]);

  // Esc pour fermer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addOne = (item: DailyBriefingItem) => {
    const id = item.conversationId;
    if (created.has(id)) return;
    // Impact immédiat sur le dashboard (optimiste) + état "ajoutée".
    addTask(buildTaskFromItem(item));
    setCreated((c) => new Set(c).add(id));
    // Persistance serveur en arrière-plan (best effort).
    void createTaskFromBrief({
      conversationId: item.conversationId,
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
    for (const it of items) {
      if (!created.has(it.conversationId)) addOne(it);
    }
    push({ kind: "info", text: "Toutes les tâches ont été ajoutées ✨", duration: 2600 });
  };

  const remaining = items.filter((it) => !created.has(it.conversationId)).length;

  return (
    <div className="mue-scanner-panel">
      <button type="button" className="suggest-close" onClick={onClose} aria-label="Fermer">
        ✕
      </button>

      {phase === "thinking" && (
        <div className="suggest-thinking">
          {/* Scan IA : les derniers messages défilent et un faisceau dégradé Mue
              les balaie de haut en bas comme un scanner. */}
          <div className="mue-scan" aria-hidden>
            <div
              className="mue-scan-track"
              style={{ transform: `translateY(${120 - scanIdx * 72}px)` }}
            >
              {scanCards.map((c, i) => (
                <div
                  className={`mue-scan-card ${i === scanIdx ? "is-scanning" : ""}`}
                  key={`${c.id}-${i}`}
                >
                  <Avatar avatar={c.avatar} className="mue-scan-av" size={30} />
                  <div className="mue-scan-card-main">
                    <div className="mue-scan-card-top">
                      <span className="mue-scan-card-name">{c.name}</span>
                      <ChannelLogo channel={c.channel} className="mue-scan-card-ch" />
                    </div>
                    <span className="mue-scan-card-preview">{c.preview}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mue-scan-veil" />
          </div>
          <p className="suggest-thinking-text">
            <span className="suggest-thinking-spark">
              <Sparkle size={14} />
            </span>
            {THINKING_STEPS[step]}
          </p>
        </div>
      )}

      {phase === "result" && (
        <div className="suggest-result">
          <header className="suggest-head">
            <span className="suggest-badge">
              <Sparkle size={13} /> Mue
            </span>
            <h2>
              {items.length} tâche{items.length > 1 ? "s" : ""} proposée
              {items.length > 1 ? "s" : ""}
            </h2>
            <p>D'après tes conversations récentes.</p>
          </header>

          <ul className="suggest-list">
            {items.map((it, i) => {
              const done = created.has(it.conversationId);
              return (
                <li
                  key={it.conversationId}
                  className={`suggest-card ${done ? "is-done" : ""}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <button
                    type="button"
                    className={`suggest-checkbox ${done ? "is-checked" : ""}`}
                    onClick={() => {
                      if (!done) addOne(it);
                    }}
                    aria-label={done ? "Tâche ajoutée" : "Ajouter la tâche"}
                    disabled={done}
                  >
                    {done && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        className="checkbox-tick"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  <div className="suggest-card-content">
                    <h3 className="suggest-card-title">{it.title}</h3>
                    {it.why && <p className="suggest-card-desc">{it.why}</p>}

                    {it.imageUrl && (
                      <div className="suggest-card-image-wrap">
                        <img src={it.imageUrl} alt={it.title} className="suggest-card-image" />
                      </div>
                    )}

                    <div className="suggest-card-footer">
                      {it.avatars && it.avatars.length > 0 && (
                        <div className="suggest-card-avatars">
                          {it.avatars.map((av, idx) => {
                            const key = av.url || av.text || `av-${idx}`;
                            return (
                              <Avatar
                                key={key}
                                avatar={av as Task["avatar"]}
                                className="suggest-card-avatar"
                              />
                            );
                          })}
                        </div>
                      )}
                      {it.timeAgo && <span className="suggest-card-time">{it.timeAgo}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <footer className="suggest-foot">
            <button
              type="button"
              className="suggest-add-all"
              onClick={addAll}
              disabled={remaining === 0}
            >
              {remaining === 0 ? "Tout est ajouté ✓" : `Tout ajouter (${remaining})`}
            </button>
            <button type="button" className="suggest-done" onClick={onClose}>
              Terminé
            </button>
          </footer>
        </div>
      )}

      {phase === "empty" && (
        <div className="suggest-empty">
          <div className="suggest-orb suggest-orb-calm">
            <span className="suggest-orb-core">
              <Sparkle size={24} />
            </span>
          </div>
          <h2>Inbox calme ✨</h2>
          <p>Mue ne voit rien d'urgent à transformer en tâche. Profite du calme.</p>
          <button type="button" className="suggest-done" onClick={onClose}>
            Fermer
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="suggest-empty">
          <h2>Mue est indisponible</h2>
          <p>Réessaie dans un instant.</p>
          <button type="button" className="suggest-done" onClick={onClose}>
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
