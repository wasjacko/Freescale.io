"use client";

import { MueAvatar } from "@/components/MueAvatar";
import { Icon } from "@/components/icons/Icon";
import { type MueMemoryRow, listMueMemories, saveMueMemory } from "@/lib/actions/mue";
import { useToast } from "@/lib/hooks/useToast";
import { useEffect, useState, useTransition } from "react";

const CONTEXT_CHIPS = [
  { id: "client", icon: "i-user", label: "A client" },
  { id: "project", icon: "i-folder", label: "A project" },
  { id: "preferences", icon: "i-heart-o", label: "Preferences" },
  { id: "processes", icon: "i-cog", label: "Processes" },
  { id: "anything", icon: "i-spark", label: "Anything" },
] as const;

export function AIKnowledgeView() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<(typeof CONTEXT_CHIPS)[number]["id"]>("anything");
  const [memories, setMemories] = useState<MueMemoryRow[]>([]);
  const [pending, startTransition] = useTransition();
  const push = useToast((s) => s.push);

  useEffect(() => {
    let cancelled = false;
    void listMueMemories().then((res) => {
      if (cancelled) return;
      if (res.error) {
        push({ kind: "error", text: `Mémoire Mue indisponible : ${res.error}` });
        return;
      }
      setMemories(res.memories);
    });
    return () => {
      cancelled = true;
    };
  }, [push]);

  const handleChip = (chip: (typeof CONTEXT_CHIPS)[number]) => {
    setKind(chip.id);
    const label = chip.label;
    setText(`About ${label.toLowerCase()}: `);
    // Focus the textarea
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(".ai-textarea");
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
  };

  const handleSave = () => {
    const content = text.trim();
    if (!content || pending) return;
    startTransition(async () => {
      const res = await saveMueMemory({ kind, content });
      if (!res.ok) {
        push({ kind: "error", text: res.error ?? "Mémoire Mue non sauvegardée." });
        return;
      }
      setText("");
      const refreshed = await listMueMemories();
      setMemories(refreshed.memories);
      push({ kind: "success", text: "Mue s'en souviendra." });
    });
  };

  return (
    <section className="ai-view" aria-label="AI Knowledge">
      <div className="ai-inner">
        <div className="ai-avatar" id="ai-yuka-canvas">
          <MueAvatar />
        </div>
        <h1 className="ai-title">Mue is here to help you.</h1>
        <p className="ai-subtitle">Give Mue the context it needs to assist you better.</p>

        <div className="ai-form">
          <div className="ai-form-label">What should Mue know?</div>
          <div className="ai-input-box">
            <textarea
              className="ai-textarea"
              placeholder="Write anything about a client, a project, a preference…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="ai-input-bar">
              <button className="ai-spark-btn" type="button" aria-label="Suggest">
                <Icon name="i-spark" />
              </button>
              <button
                className="ai-send-btn"
                type="button"
                aria-label="Save"
                onClick={handleSave}
                disabled={pending || !text.trim()}
              >
                <Icon name="i-arrow-up" />
              </button>
            </div>
          </div>
        </div>

        <div className="ai-context">
          <div className="ai-context-label">Add context about…</div>
          <div className="ai-chips">
            {CONTEXT_CHIPS.map((c) => (
              <button
                key={c.id}
                className={`ai-chip ${kind === c.id ? "is-active" : ""}`}
                type="button"
                onClick={() => handleChip(c)}
              >
                <Icon name={c.icon} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ai-privacy">
          <Icon name="i-lock" />
          This knowledge is private and only visible to you.
        </div>

        {memories.length > 0 && (
          <div className="ai-memory-list" aria-label="Saved Mue memories">
            {memories.slice(0, 6).map((memory) => (
              <div key={memory.id} className="ai-memory-item">
                <span>{memory.kind}</span>
                <p>{memory.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
