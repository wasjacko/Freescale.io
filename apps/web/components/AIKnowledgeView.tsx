"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MueAvatar } from "@/components/MueAvatar";

const CONTEXT_CHIPS = [
  { id: "client", icon: "i-user", label: "A client" },
  { id: "project", icon: "i-folder", label: "A project" },
  { id: "preferences", icon: "i-heart-o", label: "Preferences" },
  { id: "processes", icon: "i-cog", label: "Processes" },
  { id: "anything", icon: "i-spark", label: "Anything" },
] as const;

export function AIKnowledgeView() {
  const [text, setText] = useState("");

  const handleChip = (label: string) => {
    setText(`About ${label.toLowerCase()}: `);
    // Focus the textarea
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(".ai-textarea");
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    // Future: persist to Supabase
    setText("");
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
              <button className="ai-send-btn" type="button" aria-label="Save" onClick={handleSave}>
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
                className="ai-chip"
                type="button"
                onClick={() => handleChip(c.label)}
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
      </div>
    </section>
  );
}
