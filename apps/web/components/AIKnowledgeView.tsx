"use client";

import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  type MueMemoryRow,
  learnMueStyleFromSentMail,
  listMueMemories,
  saveMueMemory,
} from "@/lib/actions/mue";
import { useData } from "@/lib/contexts/DataContext";
import { useToast } from "@/lib/hooks/useToast";
import { useEffect, useState, useTransition } from "react";

const CONTEXT_CHIPS = [
  { id: "client", icon: "i-user", label: "Un client" },
  { id: "project", icon: "i-folder", label: "Un projet" },
  { id: "preferences", icon: "i-heart-o", label: "Préférences" },
  { id: "processes", icon: "i-cog", label: "Process" },
  { id: "anything", icon: "i-spark", label: "Autre" },
] as const;

// Démonstration locale du style appris par Mue. En prod, à câbler sur
// fetchMueProfileContext (mue_style_profile) — voir learnMueStyleFromSentMail.
const MUE_STYLE = {
  learnedFrom: "Appris de 142 emails envoyés",
  traits: [
    { label: "Ton", value: "Direct & chaleureux" },
    { label: "Longueur", value: "Court — 3 à 5 phrases" },
    { label: "Ouverture", value: "« Salut [prénom], »" },
    { label: "Signature", value: "« À bientôt, Wacil »" },
    { label: "Langue", value: "Français" },
    { label: "Emojis", value: "Rares (1 max)" },
  ],
  sample:
    "Salut Sarah, super retour ! Je te prépare la V2 des maquettes pour demain matin. À bientôt, Wacil",
};

const LANG_LABEL: Record<string, string> = {
  fr: "Français",
  en: "Anglais",
  es: "Espagnol",
  de: "Allemand",
  it: "Italien",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const h = diff / 3_600_000;
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

function firstNameOf(name: string): string {
  return name.split(/\s+/).filter(Boolean)[0] ?? name;
}

export function AIKnowledgeView() {
  const { conversations } = useData();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<(typeof CONTEXT_CHIPS)[number]["id"]>("anything");
  const [memories, setMemories] = useState<MueMemoryRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [relearning, setRelearning] = useState(false);
  const push = useToast((s) => s.push);

  const clients = conversations.filter((c) => c.category === "client");

  useEffect(() => {
    let cancelled = false;
    void listMueMemories().then((res) => {
      if (cancelled) return;
      if (res.error) {
        // Mode démo / migration absente — on n'alarme pas, la mémoire est optionnelle.
        return;
      }
      setMemories(res.memories);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChip = (chip: (typeof CONTEXT_CHIPS)[number]) => {
    setKind(chip.id);
    setText(`À propos de ${chip.label.toLowerCase()} : `);
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

  const handleRelearn = () => {
    if (relearning) return;
    setRelearning(true);
    void learnMueStyleFromSentMail()
      .then((res) => {
        setRelearning(false);
        if (res.error) {
          push({
            kind: "info",
            text: "Mue affinera ton style dès que tu auras envoyé quelques emails.",
          });
          return;
        }
        push({ kind: "success", text: "Style ré-analysé." });
      })
      .catch(() => {
        setRelearning(false);
        push({ kind: "info", text: "Réessaie dans un instant." });
      });
  };

  return (
    <section className="ai-view" aria-label="AI Knowledge">
      <div className="ai-proof-inner">
        {/* Hero — la promesse devient une preuve */}
        <header className="page-head">
          <h1>Ce que Mue sait de toi</h1>
          <div className="page-head-actions">
            <button className="cal-btn" type="button" onClick={handleRelearn} disabled={relearning}>
              {relearning ? "Analyse…" : "Rafraîchir"}
            </button>
          </div>
        </header>
        <p className="ai-proof-sub">
          Plus tu écris, plus Mue te ressemble. Voici ce qu'il a appris — privé, visible par toi
          seul.
        </p>

        {/* Ton style d'écriture */}
        <section className="ai-block">
          <div className="ai-block-head">
            <h2>Ton style d'écriture</h2>
            <span className="ai-block-meta">{MUE_STYLE.learnedFrom}</span>
          </div>
          <div className="ai-style-card">
            <div className="ai-style-grid">
              {MUE_STYLE.traits.map((t) => (
                <div key={t.label} className="ai-style-trait">
                  <span className="ai-style-trait-label">{t.label}</span>
                  <span className="ai-style-trait-value">{t.value}</span>
                </div>
              ))}
            </div>
            <p className="ai-style-sample">
              <span className="ai-style-sample-label">Ce que Mue écrirait pour toi</span>
              <span className="ai-style-quote">« {MUE_STYLE.sample} »</span>
            </p>
            <button
              className="ai-restyle"
              type="button"
              onClick={handleRelearn}
              disabled={relearning}
            >
              {relearning ? "Analyse en cours…" : "Ré-analyser mon style"}
            </button>
          </div>
        </section>

        {/* Mémoire client — données réelles (ton + langue par client) */}
        {clients.length > 0 && (
          <section className="ai-block">
            <div className="ai-block-head">
              <h2>Mémoire client</h2>
              <span className="ai-block-meta">
                {clients.length} client{clients.length > 1 ? "s" : ""} suivi
                {clients.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="ai-client-grid">
              {clients.map((c) => (
                <article key={c.id} className="ai-client-card">
                  <div className="ai-client-top">
                    <Avatar avatar={c.avatar} />
                    <strong>{c.name}</strong>
                  </div>
                  <ul className="ai-client-facts">
                    <li>
                      <span>Ton préféré</span>
                      <b>{c.clientTone ?? "à apprendre"}</b>
                    </li>
                    <li>
                      <span>Langue</span>
                      <b>{c.clientLang ? (LANG_LABEL[c.clientLang] ?? c.clientLang) : "—"}</b>
                    </li>
                    <li>
                      <span>Dernier échange</span>
                      <b>{timeAgo(c.lastInboundAt ?? c.lastAtIso)}</b>
                    </li>
                  </ul>
                  <p className="ai-client-note">
                    Mue adapte ton et formules pour {firstNameOf(c.name)} automatiquement.
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Apprendre quelque chose à Mue (formulaire conservé) */}
        <section className="ai-block">
          <div className="ai-block-head">
            <h2>Apprends-lui autre chose</h2>
          </div>
          <div className="ai-form">
            <div className="ai-input-box">
              <textarea
                className="ai-textarea"
                placeholder="Écris ce que Mue doit savoir : un client, un projet, une préférence…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="ai-input-bar">
                <button className="ai-spark-btn" type="button" aria-label="Suggérer">
                  <Icon name="i-spark" />
                </button>
                <button
                  className="ai-send-btn"
                  type="button"
                  aria-label="Enregistrer"
                  onClick={handleSave}
                  disabled={pending || !text.trim()}
                >
                  <Icon name="i-arrow-up" />
                </button>
              </div>
            </div>
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

          {memories.length > 0 ? (
            <div className="ai-memory-list" aria-label="Connaissances enregistrées">
              {memories.slice(0, 6).map((memory) => (
                <div key={memory.id} className="ai-memory-item">
                  <span>{memory.kind}</span>
                  <p>{memory.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="i-book"
              title="Rien d'autre pour l'instant"
              description="Ajoute une info ci-dessus — Mue s'en servira pour personnaliser ses réponses."
            />
          )}

          <div className="ai-privacy">
            <Icon name="i-lock" />
            Ces connaissances sont privées et visibles par toi seul.
          </div>
        </section>
      </div>
    </section>
  );
}
