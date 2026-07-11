"use client";

import { ChannelLogo } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useData } from "@/lib/contexts/DataContext";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";

/**
 * Revue des tâches détectées par Mue — déclenchée par le bandeau
 * « Mue a détecté X tâches dans tes messages ». Le user confirme :
 * garder ou ignorer chaque tâche, avec le message source. UI/mock.
 */
export function AiTasksReviewModal() {
  const { aiReviewOpen, setAiReviewOpen, mueOpen } = useApp();
  const { tasks, conversations, removeTask } = useData();
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  const aiTasks = tasks.filter((t) => t.fromAI && !t.parentTaskId && t.status !== "done");

  useEffect(() => {
    if (aiReviewOpen) setIgnored(new Set());
  }, [aiReviewOpen]);

  useEffect(() => {
    if (!aiReviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAiReviewOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [aiReviewOpen, setAiReviewOpen]);

  if (!aiReviewOpen) return null;

  const toggle = (id: string) =>
    setIgnored((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const kept = aiTasks.length - ignored.size;
  const confirm = () => {
    for (const id of ignored) removeTask(id);
    setAiReviewOpen(false);
  };

  return (
    <div
      className={`ccm-overlay ${mueOpen ? "mue-panel-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tâches détectées par Mue"
    >
      <button
        type="button"
        className="ccm-backdrop"
        aria-hidden
        tabIndex={-1}
        onClick={() => setAiReviewOpen(false)}
      />
      <div className="ccm-sheet">
        <header className="ccm-head">
          <div>
            <h2 className="ccm-title">Tâches détectées par Mue</h2>
            <p className="ccm-sub">
              Mue a transformé tes messages en {aiTasks.length} tâche{aiTasks.length > 1 ? "s" : ""}
              . Garde celles qui comptent, ignore le reste.
            </p>
          </div>
          <button
            type="button"
            className="ccm-close"
            aria-label="Fermer"
            onClick={() => setAiReviewOpen(false)}
          >
            ✕
          </button>
        </header>

        <div className="atr-list">
          {aiTasks.map((t) => {
            const conv = t.conversationId
              ? conversations.find((c) => c.id === t.conversationId)
              : null;
            const off = ignored.has(t.id);
            return (
              <div key={t.id} className={`atr-row ${off ? "is-off" : ""}`}>
                <span className="atr-main">
                  <span className="atr-title">{t.title}</span>
                  {conv && (
                    <span className="atr-src">
                      <ChannelLogo channel={conv.channel} className="atr-chan" />
                      <Avatar avatar={{ ...conv.avatar, alt: conv.name }} size={16} />
                      <b>{conv.name}</b>
                      <span className="atr-quote">« {conv.preview} »</span>
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className={`atr-toggle ${off ? "is-ignored" : ""}`}
                  onClick={() => toggle(t.id)}
                >
                  {off ? "Ignorée" : "Garder"}
                </button>
              </div>
            );
          })}
          {aiTasks.length === 0 && (
            <div className="atr-empty">Aucune tâche détectée pour l'instant.</div>
          )}
        </div>

        <footer className="ccm-foot">
          <button type="button" className="ccm-skip" onClick={() => setAiReviewOpen(false)}>
            Annuler
          </button>
          <button type="button" className="ccm-confirm" onClick={confirm}>
            Garder {kept} tâche{kept > 1 ? "s" : ""}
          </button>
        </footer>
      </div>
    </div>
  );
}
