"use client";

import { EmailHtmlBody } from "@/components/EmailHtmlBody";
import { TagPopover } from "@/components/TagPopover";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import {
  type ConversationCollaboration,
  assignConversation,
  createInternalNote,
  listConversationCollaboration,
} from "@/lib/actions/collaboration";
import { type EmailTemplate, listEmailTemplates } from "@/lib/actions/email-templates";
import { createTask, sendEmailReply } from "@/lib/actions/inbox";
import {
  type ReplySuggestion,
  type SuggestedTask,
  type ThreadSummary,
  type TranslatedMessage,
  rewriteDraftTone,
  suggestReplies,
  suggestTasks,
  summarizeThread,
  translateThread,
} from "@/lib/actions/mue";
import { getEmailSignature } from "@/lib/actions/profile";
import { getConversationMessages } from "@/lib/actions/thread-messages";
import { isEmailLikeChannel } from "@/lib/channels/registry";
import { formatActivityEvent } from "@/lib/collaboration";
import { useData } from "@/lib/contexts/DataContext";
import { cleanEmailBody } from "@/lib/email-body-clean";
import { useToast } from "@/lib/hooks/useToast";
import { MOCK_CLIENTS } from "@/lib/mock-v2";
import type { MueTone } from "@/lib/mue-chat";
import { useApp } from "@/lib/store";
import type { Message } from "@/lib/types";
import { isAwaitingMyReply } from "@/lib/urgency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

/**
 * Libellé du séparateur de date dans le fil, façon maquette :
 * « Aujourd'hui, 10:08 » le jour même, « Mardi, 16:53 » sinon. L'heure est
 * celle du premier message du jour.
 */
function daySeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Aujourd'hui, ${time}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Hier, ${time}`;
  const weekday = d.toLocaleDateString("fr-FR", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${time}`;
}

type ThreadAiResult =
  | { kind: "summary"; data: ThreadSummary }
  | { kind: "tasks"; data: SuggestedTask[] }
  | { kind: "translation"; data: TranslatedMessage[]; lang: string }
  | { kind: "loading"; label: string }
  | { kind: "error"; message: string };

const TRANSLATE_LANGS: Array<{ code: string; label: string; flag: string }> = [
  { code: "en", label: "anglais", flag: "🇬🇧" },
  { code: "es", label: "espagnol", flag: "🇪🇸" },
  { code: "fr", label: "français", flag: "🇫🇷" },
  { code: "it", label: "italien", flag: "🇮🇹" },
  { code: "de", label: "allemand", flag: "🇩🇪" },
  { code: "pt", label: "portugais", flag: "🇵🇹" },
  { code: "nl", label: "néerlandais", flag: "🇳🇱" },
  { code: "ar", label: "arabe", flag: "🇸🇦" },
  { code: "zh", label: "chinois", flag: "🇨🇳" },
  { code: "ja", label: "japonais", flag: "🇯🇵" },
];

type MsgGroup = {
  dir: "in" | "out";
  items: Message[];
};

function groupMessages(messages: Message[]): MsgGroup[] {
  const groups: MsgGroup[] = [];
  let curr: MsgGroup | null = null;
  for (const m of messages) {
    if (!curr || curr.dir !== m.dir) {
      curr = { dir: m.dir, items: [m] };
      groups.push(curr);
    } else {
      curr.items.push(m);
    }
  }
  return groups;
}

export function Thread({
  currentUser,
}: {
  currentUser?: { name: string; avatarUrl: string | null } | null;
}) {
  const { activeConvId, setActiveConv, setView, setActiveClientId } = useApp();
  const {
    conversations,
    messagesByConv,
    appendOutgoingMessage,
    retryFailedMessage,
    setTags,
    archive,
    snooze,
  } = useData();
  // Section collaboration (notes internes + activité) repliée par défaut —
  // elle s'ouvre via l'icône bulle de l'en-tête, façon maquette.
  const [collabOpen, setCollabOpen] = useState(false);
  // Composer compact au repos (1 ligne) — s'étend au focus.
  const [composerFocus, setComposerFocus] = useState(false);
  // Clic droit sur 🕐 = choix du réveil (clic court = demain 9h).
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const conv = conversations.find((c) => c.id === activeConvId);
  const push = useToast((s) => s.push);

  const [input, setInput] = useState("");
  const messagesEl = useRef<HTMLElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const tagBtnRef = useRef<HTMLButtonElement>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagAnchor, setTagAnchor] = useState<DOMRect | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Live-fetch messages from Gmail on conv open. messagesByConv (server
  // DB cache) used only as an INSTANT fallback for the conv we last
  // rendered — never leaks across conv switches (would show the wrong
  // thread's content for ~300ms while the new fetch resolved).
  const [liveByConv, setLiveByConv] = useState<Record<string, Message[]>>({});
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [collab, setCollab] = useState<ConversationCollaboration | null>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabPending, setCollabPending] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const activeLiveMessages = activeConvId ? liveByConv[activeConvId] : undefined;
  const canLiveFetch = conv?.channel === "gmail";

  useEffect(() => {
    if (!activeConvId || !canLiveFetch) {
      setLiveError(null);
      setLoadingConvId(null);
      return;
    }
    // If we already have live messages for THIS conv, skip the re-fetch —
    // user just navigated back to a thread they opened earlier in the
    // session.
    if (activeLiveMessages) return;

    let cancelled = false;
    setLoadingConvId(activeConvId);
    setLiveError(null);
    getConversationMessages(activeConvId)
      .then((result) => {
        if (cancelled) return;
        if (result.error) setLiveError(result.error);
        setLiveByConv((prev) => ({ ...prev, [activeConvId]: result.messages }));
      })
      .catch((err) => {
        if (cancelled) return;
        setLiveError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingConvId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConvId, activeLiveMessages, canLiveFetch]);

  useEffect(() => {
    if (!activeConvId) {
      setCollab(null);
      return;
    }
    let cancelled = false;
    setCollabLoading(true);
    listConversationCollaboration(activeConvId)
      .then((data) => {
        if (!cancelled) setCollab(data);
      })
      .finally(() => {
        if (!cancelled) setCollabLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  const isLiveLoading = loadingConvId === activeConvId;

  // Strict per-conv lookup. NO fallback to messagesByConv across convs —
  // showing the wrong thread's content during a switch was the "loading
  // flash" bug.
  const messages = useMemo<Message[]>(
    () => liveByConv[activeConvId] ?? messagesByConv[activeConvId] ?? [],
    [liveByConv, messagesByConv, activeConvId]
  );
  const messageCount = messages.length;

  const isEmail = isEmailLikeChannel(conv?.channel);
  const groups = useMemo(() => groupMessages(messages), [messages]);

  // Skeleton flash on conv switch
  useEffect(() => {
    if (activeConvId === undefined) return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(t);
  }, [activeConvId]);

  // Auto-scroll to bottom on conv change or send
  useEffect(() => {
    if (activeConvId === undefined || messageCount < 0) return;
    if (messagesEl.current) {
      messagesEl.current.scrollTop = messagesEl.current.scrollHeight;
    }
  }, [activeConvId, messageCount]);

  if (!conv) {
    return (
      <section className="thread thread-empty-pane">
        <div className="thread-empty-card">
          <div className="thread-empty-illu" aria-hidden>
            <svg viewBox="0 0 600 340" fill="none" overflow="visible"
              xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="fs-illu-grad" x1="0" y1="0" x2="600" y2="320"
                  gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#78AABF" />
                  <stop offset="18%" stopColor="#6981B8" />
                  <stop offset="38%" stopColor="#611C71" />
                  <stop offset="58%" stopColor="#EB0020" />
                  <stop offset="74%" stopColor="#FE0045" />
                  <stop offset="88%" stopColor="#E1B9B8" />
                  <stop offset="100%" stopColor="#6981B8" />
                </linearGradient>
                {/* Halos radiaux : se fondent vers le transparent (aucune arête). */}
                <radialGradient id="fs-illu-halo-a">
                  <stop offset="0%" stopColor="#6981B8" stopOpacity="0.20" />
                  <stop offset="60%" stopColor="#6981B8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#6981B8" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="fs-illu-halo-b">
                  <stop offset="0%" stopColor="#FE0045" stopOpacity="0.16" />
                  <stop offset="60%" stopColor="#FE0045" stopOpacity="0.07" />
                  <stop offset="100%" stopColor="#FE0045" stopOpacity="0" />
                </radialGradient>
                {/* Ombre douce pour la boîte (remplace le contour). */}
                <filter id="fs-illu-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="8" stdDeviation="16"
                    floodColor="#1a1730" floodOpacity="0.12" />
                </filter>
                <clipPath id="fs-av-1">
                  <circle cx="84" cy="86" r="30" />
                </clipPath>
                <clipPath id="fs-av-2">
                  <circle cx="514" cy="72" r="30" />
                </clipPath>
                <clipPath id="fs-av-3">
                  <circle cx="106" cy="262" r="28" />
                </clipPath>
                <clipPath id="fs-av-4">
                  <circle cx="510" cy="258" r="28" />
                </clipPath>
              </defs>

              {/* Halos d'ambiance : le dégradé radial atteint 0 pile à son rayon,
                  et le cercle tient dans le viewBox → aucune coupure nette. */}
              <circle cx="190" cy="170" r="170" fill="url(#fs-illu-halo-a)" />
              <circle cx="430" cy="170" r="170" fill="url(#fs-illu-halo-b)" />

              {/* Liens canaux → boîte centrale */}
              <g stroke="url(#fs-illu-grad)" strokeWidth="2" strokeLinecap="round"
                strokeDasharray="2 9" opacity="0.5">
                <path d="M96 92 Q180 120 212 150" />
                <path d="M506 78 Q424 110 388 150" />
                <path d="M118 256 Q180 232 214 200" />
                <path d="M498 252 Q436 230 386 200" />
              </g>

              {/* Boîte unifiée (au centre) — sans contour, juste une ombre douce */}
              <rect x="206" y="112" width="188" height="126" rx="22"
                fill="#ffffff" filter="url(#fs-illu-shadow)" />
              {/* 3 rangées de conversation */}
              <g>
                <circle cx="234" cy="142" r="9" fill="url(#fs-illu-grad)" />
                <rect x="252" y="137" width="116" height="6" rx="3" fill="#e7eaf2" />
                <rect x="252" y="148" width="78" height="5" rx="2.5" fill="#eef0f6" />

                <circle cx="234" cy="175" r="9" fill="url(#fs-illu-grad)" opacity="0.78" />
                <rect x="252" y="170" width="116" height="6" rx="3" fill="#e7eaf2" />
                <rect x="252" y="181" width="64" height="5" rx="2.5" fill="#eef0f6" />

                <circle cx="234" cy="208" r="9" fill="url(#fs-illu-grad)" opacity="0.56" />
                <rect x="252" y="203" width="116" height="6" rx="3" fill="#e7eaf2" />
                <rect x="252" y="214" width="88" height="5" rx="2.5" fill="#eef0f6" />
              </g>

              {/* Avatars réels (photos contacts) + pastille canal */}
              <g>
                <image href="/avatars/1.webp" x="54" y="56" width="60" height="60"
                  clipPath="url(#fs-av-1)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="104" cy="104" r="9" fill="#25D366" stroke="#fff" strokeWidth="3" />

                <image href="/avatars/2.webp" x="484" y="42" width="60" height="60"
                  clipPath="url(#fs-av-2)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="534" cy="90" r="9" fill="#EA4335" stroke="#fff" strokeWidth="3" />

                <image href="/avatars/3.webp" x="78" y="234" width="56" height="56"
                  clipPath="url(#fs-av-3)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="125" cy="278" r="8.5" fill="#0A66C2" stroke="#fff" strokeWidth="3" />

                <image href="/avatars/4.webp" x="482" y="230" width="56" height="56"
                  clipPath="url(#fs-av-4)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="529" cy="274" r="8.5" fill="#7B5CFF" stroke="#fff" strokeWidth="3" />
              </g>

              {/* Étincelles */}
              <g fill="url(#fs-illu-grad)">
                <path d="M408 96l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" opacity="0.7" />
                <path d="M188 214l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" opacity="0.5" />
              </g>
            </svg>
          </div>
          <h2 className="thread-empty-title">Discutez avec tous vos contacts au même endroit !</h2>
          <p className="thread-empty-text">
            C'est ici que vous échangez avec vos contacts sur tous vos canaux connectés. Chaque fois
            que quelqu'un vous envoie un message, il apparaît ici. Vous pouvez modifier cela et plus
            encore dans les{" "}
            <Link href="/app/settings/connections" className="thread-empty-link">
              Réglages de l'Inbox
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    sendBtnRef.current?.classList.add("is-sending");
    setTimeout(() => sendBtnRef.current?.classList.remove("is-sending"), 500);
    // Clear the input optimistically. If the send fails, the message
    // stays visible in the thread tagged "failed" — the user's draft
    // isn't lost, they just retap to retry.
    setInput("");
    try {
      await appendOutgoingMessage(activeConvId, text);
    } catch (err) {
      push({
        kind: "error",
        text: err instanceof Error ? `Envoi échoué : ${err.message}` : "Envoi échoué — réessayez.",
        duration: 5000,
      });
    }
  };

  const refreshCollab = async () => {
    if (!activeConvId) return;
    setCollab(await listConversationCollaboration(activeConvId));
  };

  const handleAssign = async (assigneeId: string) => {
    setCollabPending("assign");
    const result = await assignConversation({
      conversationId: activeConvId,
      assigneeId: assigneeId || null,
    });
    setCollabPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Assignation impossible." });
      return;
    }
    await refreshCollab();
  };

  const handleCreateNote = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = noteDraft.trim();
    if (!body) return;
    setCollabPending("note");
    const result = await createInternalNote({ conversationId: activeConvId, body });
    setCollabPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Note impossible." });
      return;
    }
    setNoteDraft("");
    await refreshCollab();
  };

  const firstName = conv.name.split(/[ –-]/)[0]?.trim() ?? "";

  // Client (mock) lié à cette conversation → bouton « Voir la fiche client ».
  const linkedClient = MOCK_CLIENTS.find((c) => c.conversationIds?.includes(conv.id));

  // Avatar de l'utilisateur (messages sortants) : vraie image si dispo, sinon
  // initiales. Donne une conversation à deux faces (avatars des deux côtés).
  const userInitials =
    (currentUser?.name ?? "Moi")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "M";
  const userAvatar: import("@/lib/types").Avatar = currentUser?.avatarUrl
    ? { kind: "img", src: currentUser.avatarUrl, alt: currentUser.name }
    : { kind: "initials", text: userInitials, bg: "#E8EAFF" };

  return (
    <main className="thread">
      <header className="thread-head">
        {/* Back-to-inbox button — visible at all viewports now since
            opening a conv hides the inbox list entirely. Returns the
            user to the conv list by clearing activeConvId AND forcing
            view to "inbox" (defensive — in case the user opened a
            thread via command palette from a non-inbox view). */}
        <button
          type="button"
          className="thread-back"
          onClick={() => {
            setView("inbox");
            setActiveConv("");
          }}
          aria-label="Retour à l'inbox"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Inbox</span>
        </button>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: l'icône bulle offre le même accès clavier */}
        <div
          className="contact contact-clickable"
          onClick={() => setCollabOpen((v) => !v)}
          title="Notes internes"
        >
          <span className="avatar large">
            <Avatar avatar={conv.avatar} className="" />
            <span className="status-dot" />
          </span>
          <div>
            <h1>{conv.name}</h1>
            <div className="contact-sub">
              {/* Canal unique, ou sélecteur de canaux si le client en a plusieurs. */}
              {(() => {
                const siblings = conv.clientId
                  ? conversations.filter((x) => x.clientId === conv.clientId)
                  : [conv];
                if (siblings.length <= 1) {
                  return (
                    <span className="thread-chan-inline">
                      <ChannelLogo channel={conv.channel} className="" />
                      {conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1)}
                    </span>
                  );
                }
                return (
                  <span className="thread-chan-tabs" role="tablist" aria-label="Canaux du client">
                    {siblings.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        role="tab"
                        aria-selected={x.id === conv.id}
                        className={`thread-chan-tab ${x.id === conv.id ? "active" : ""}`}
                        title={x.channel}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveConv(x.id);
                        }}
                      >
                        <ChannelLogo channel={x.channel} className="" />
                      </button>
                    ))}
                  </span>
                );
              })()}
              <span className="contact-sub-sep" aria-hidden>
                ·
              </span>
              <select
                className="thread-assign"
                aria-label="Assignée à"
                value={collab?.assignedTo ?? conv.assignedTo ?? ""}
                onChange={(event) => void handleAssign(event.target.value)}
                disabled={
                  collabLoading ||
                  collabPending === "assign" ||
                  !collab?.permissions.canAssignConversation
                }
              >
                <option value="">Non assignée</option>
                {(collab?.members ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName || member.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="head-actions">
          {linkedClient && (
            <button
              type="button"
              className="thread-client-btn"
              data-tip="Voir la fiche client"
              aria-label="Voir la fiche client"
              onClick={() => {
                setActiveClientId(linkedClient.id);
                setView("clients");
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Fiche client</span>
            </button>
          )}
          <button
            ref={tagBtnRef}
            className={`icon-btn ${(conv.tags?.length ?? 0) > 0 ? "is-on" : ""}`}
            type="button"
            aria-label="Tags"
            data-tip="Tags"
            aria-expanded={tagOpen}
            onClick={() => {
              setTagAnchor(tagBtnRef.current?.getBoundingClientRect() ?? null);
              setTagOpen((v) => !v);
            }}
          >
            <Icon name="i-tag" />
            {(conv.tags?.length ?? 0) > 0 && (
              <span className="icon-btn-badge">{conv.tags?.length}</span>
            )}
          </button>
          <span className="snooze-wrap">
            {snoozeMenuOpen && (
              <div className="snooze-menu" role="menu">
                {[
                  { label: "Ce soir 18h", h: 18, d: 0 },
                  { label: "Demain 9h", h: 9, d: 1 },
                  { label: "Lundi 9h", h: 9, d: (8 - new Date().getDay()) % 7 || 7 },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const t = new Date();
                      t.setDate(t.getDate() + o.d);
                      t.setHours(o.h, 0, 0, 0);
                      void snooze(conv.id, t.toISOString());
                      setSnoozeMenuOpen(false);
                      push({
                        kind: "info",
                        text: `Conversation en pause — ${o.label}`,
                        action: { label: "Annuler", fn: () => void snooze(conv.id, null) },
                      });
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            <button
              className="icon-btn"
              type="button"
              onContextMenu={(e) => {
                e.preventDefault();
                setSnoozeMenuOpen((v) => !v);
              }}
              aria-label="Mettre en pause jusqu'à demain (clic droit : options)"
              data-tip="En pause jusqu'à demain"
              onClick={() => {
                const t = new Date();
                t.setDate(t.getDate() + 1);
                t.setHours(9, 0, 0, 0);
                void snooze(conv.id, t.toISOString());
                push({
                  kind: "info",
                  text: "Conversation en pause jusqu'à demain 9h",
                  action: { label: "Annuler", fn: () => void snooze(conv.id, null) },
                });
              }}
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15.5 14" />
              </svg>
            </button>
          </span>
          <button
            className="icon-btn"
            type="button"
            aria-label="Terminer la conversation"
            data-tip="Terminer"
            onClick={() => {
              const ordered = [...conversations].sort(
                (a, b) => new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime()
              );
              const idxNow = ordered.findIndex((c) => c.id === conv.id);
              const next = ordered.find((c, i) => i > idxNow && c.id !== conv.id);
              archive(conv.id);
              push({ kind: "success", text: "Conversation terminée" });
              setActiveConv(next ? next.id : "");
            }}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2.5 13 7 17.5 14 9" />
              <polyline points="10.5 13 15 17.5 22 9" />
            </svg>
          </button>
          <button
            className={`icon-btn ${collabOpen ? "is-on" : ""}`}
            type="button"
            aria-label="Notes internes"
            data-tip="Notes internes"
            aria-expanded={collabOpen}
            onClick={() => setCollabOpen((v) => !v)}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.6 8.6 0 0 1-3.5-.7L3 21l1.9-4.4a8.3 8.3 0 0 1-1.4-4.6A8.4 8.4 0 0 1 12 3.6a8.4 8.4 0 0 1 9 7.9z" />
            </svg>
          </button>
        </div>
      </header>

      <TagPopover
        open={tagOpen}
        onClose={() => setTagOpen(false)}
        tags={conv.tags ?? []}
        anchorRect={tagAnchor}
        onChange={(next) => void setTags(activeConvId, next)}
      />

      {/* Inline chips row showing the current tags. Always visible (not
          behind the popover) so the user always knows what's applied. */}
      {collabOpen && (conv.tags?.length ?? 0) > 0 && (
        <div className="thread-tags-row" aria-label="Tags appliqués">
          {(conv.tags ?? []).map((t) => (
            <span key={t} className="tag-chip is-readonly">
              {t}
            </span>
          ))}
        </div>
      )}

      {collabOpen && (
        <section className="thread-collab" aria-label="Collaboration équipe">
          <form className="thread-note-form" onSubmit={handleCreateNote}>
            <input
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Note interne... utilisez @prenom pour mentionner"
              maxLength={4000}
            />
            <button type="submit" disabled={!noteDraft.trim() || collabPending === "note"}>
              Ajouter
            </button>
          </form>

          {(collab?.notes.length ?? 0) > 0 && (
            <div className="thread-notes">
              {collab?.notes.slice(0, 3).map((note) => (
                <article key={note.id} className="thread-note">
                  <strong>{note.authorName}</strong>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
          )}

          {(collab?.activity.length ?? 0) > 0 && (
            <div className="thread-activity">
              {collab?.activity.slice(0, 4).map((event) => (
                <span key={event.id}>
                  {formatActivityEvent(event.eventType, event.actorName, event.metadata)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {collabOpen && <ThreadAiBar conversationId={activeConvId} />}

      <section
        className={`messages ${isEmail ? "is-email" : ""} ${isLoading ? "is-loading" : ""}`}
        id="thread-content"
        ref={messagesEl}
        aria-live="polite"
        tabIndex={-1}
      >
        {isLiveLoading && messages.length === 0 && (
          <div className="email-card-skeleton" aria-busy="true">
            <div className="email-card-skel-row">
              <span className="email-card-skel-avatar" />
              <span className="email-card-skel-meta">
                <span className="email-card-skel-line short" />
                <span className="email-card-skel-line tiny" />
              </span>
            </div>
            <span className="email-card-skel-line full" />
            <span className="email-card-skel-line full" />
            <span className="email-card-skel-line long" />
          </div>
        )}
        {liveError && messages.length === 0 && (
          <div
            style={{
              padding: 28,
              color: "#b91c1c",
              fontSize: 13,
              fontFamily: "monospace",
            }}
          >
            Erreur email : {liveError}
          </div>
        )}
        {isEmail
          ? messages.length === 0
            ? null
            : messages.map((m) => (
                <EmailCard
                  key={m.id}
                  message={m}
                  fallbackName={m.dir === "out" ? (currentUser?.name ?? "Moi") : conv.name}
                  fallbackAvatar={m.dir === "out" ? userAvatar : conv.avatar}
                />
              ))
          : (() => {
              let lastDay = "";
              return groups.map((g) => {
                const isOut = g.dir === "out";
                const lastTime = g.items[g.items.length - 1]?.time ?? "";
                const groupKey = `${g.dir}-${g.items[0]?.id ?? "start"}-${g.items.at(-1)?.id ?? "end"}`;
                const firstIso = g.items[0]?.sentAtIso;
                const day = firstIso ? new Date(firstIso).toDateString() : "";
                const showSep = !!day && day !== lastDay;
                if (day) lastDay = day;
                return (
                  <Fragment key={groupKey}>
                    {showSep && firstIso && (
                      <div className="msg-daysep">
                        <span>{daySeparatorLabel(firstIso)}</span>
                      </div>
                    )}
                    <div className={`msg-group ${isOut ? "out" : "in"}`}>
                      {/* Avatar rendu UNE fois par groupe, ancré en bas à gauche :
                          toutes les bulles s'alignent (gouttière fixe), peu
                          importe le nombre de messages. */}
                      {!isOut && (
                        <span className="msg-group-av" aria-hidden>
                          <Avatar avatar={conv.avatar} className="" />
                        </span>
                      )}
                      {g.items.map((m) => {
                        const isPending = m.status === "pending";
                        const isFailed = m.status === "failed";
                        return (
                          <div key={m.id} className="msg-row">
                            <div
                              className={`bubble ${isPending ? "is-pending" : ""} ${
                                isFailed ? "is-failed" : ""
                              }`}
                            >
                              <p>{m.text}</p>
                              {isFailed && (
                                <button
                                  type="button"
                                  className="bubble-retry"
                                  onClick={async () => {
                                    try {
                                      await retryFailedMessage(activeConvId, m.id);
                                    } catch (err) {
                                      push({
                                        kind: "error",
                                        text:
                                          err instanceof Error
                                            ? `Envoi échoué : ${err.message}`
                                            : "Envoi échoué — réessayez.",
                                        duration: 5000,
                                      });
                                    }
                                  }}
                                >
                                  ↻ Réessayer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <span className="msg-time" style={isOut ? { textAlign: "right" } : undefined}>
                        {lastTime}
                      </span>
                    </div>
                  </Fragment>
                );
              });
            })()}

        {/* Ligne système façon maquette : dernière activité collab (assignation,
            archivage…) affichée comme « Conversation déplacée … ». */}
        {!isEmail &&
          collab &&
          collab.activity.length > 0 &&
          (() => {
            const ev = collab.activity[0];
            if (!ev) return null;
            return (
              <div className="msg-system">
                {formatActivityEvent(ev.eventType, ev.actorName, ev.metadata)}
              </div>
            );
          })()}
      </section>

      <footer className="composer">
        {isEmail ? (
          <EmailComposer
            conversationId={activeConvId}
            toName={conv.name}
            contactEmail={conv.contactEmail ?? null}
            autoDraft={isAwaitingMyReply(conv)}
          />
        ) : (
          /* Composer chat aligné sur le composer email (mêmes classes CSS,
             façon maquette) : « À {contact} », grande zone bordée, puis
             Joindre · Modèles · Suggérer (Mue) · tons · Envoyer. */
          <div className="email-composer">
            {isEmail ? (
              <div className="email-composer-headers">
                <div className="email-composer-row">
                  <span className="email-composer-label">À</span>
                  <span className="email-composer-value">
                    <strong>{conv.name}</strong>
                  </span>
                  <button
                    type="button"
                    className="email-composer-toggle"
                    onClick={() => push({ kind: "info", text: "Cc disponible sur les emails 👋" })}
                  >
                    Cc
                  </button>
                </div>
              </div>
            ) : (
              <div className="composer-via">
                <ChannelLogo channel={conv.channel} className="" />
                Réponse via {conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1)}
              </div>
            )}
            <textarea
              className="email-composer-body"
              placeholder={`Votre réponse à ${firstName}…`}
              value={input}
              onFocus={() => setComposerFocus(true)}
              onBlur={() => setComposerFocus(false)}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={composerFocus || input ? 4 : 1}
            />
            <div className="email-composer-actions">
              <button
                type="button"
                className="email-composer-attach"
                onClick={() =>
                  push({ kind: "info", text: "Pièces jointes sur ce canal — bientôt 👋" })
                }
              >
                <Icon name="i-clip" />
                Joindre
              </button>
              <button
                type="button"
                className="email-composer-mue"
                onClick={() =>
                  setInput(
                    `Merci pour ton message ${firstName} — je te reviens avec une réponse détaillée d'ici la fin de journée.`
                  )
                }
                title="Mue propose une réponse"
              >
                <Icon name="i-spark" />
                Suggérer (Mue)
              </button>
              <span style={{ flex: 1 }} />
              {composerFocus && input.trim() && (
                <span className="composer-hint" aria-hidden>
                  ↵ envoyer
                </span>
              )}
              <button
                ref={sendBtnRef}
                type="button"
                className="email-composer-send"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Icon name="i-send" />
                Envoyer l'email
              </button>
            </div>
          </div>
        )}
      </footer>
    </main>
  );
}

/**
 * Inline Mue toolbar sitting between the thread head and the messages.
 * Holds the three contextual actions (Résumer · Tâches · Traduire) so
 * they live where the user actually reads + replies to the conversation
 * — not buried in the right-side MuePanel which now does the higher-
 * level "brief du jour" job.
 */
function ThreadAiBar({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [result, setResult] = useState<ThreadAiResult | null>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  // Tasks the user created from the inline scan — flips the per-task
  // button to a done state and prevents a double-fire.
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [createdKeys, setCreatedKeys] = useState<Set<string>>(new Set());

  // Clear any previous result the moment the user switches threads so a
  // stale summary doesn't briefly hang over the new conversation.
  useEffect(() => {
    if (!conversationId) return;
    setResult(null);
    setLangPickerOpen(false);
    setCreatedKeys(new Set());
    setCreatingKey(null);
  }, [conversationId]);

  const handleSummary = async () => {
    setResult({ kind: "loading", label: "Résumé en cours…" });
    const res = await summarizeThread(conversationId);
    if (res.error || !res.summary) {
      setResult({ kind: "error", message: res.error ?? "Erreur Mue" });
    } else {
      setResult({ kind: "summary", data: res.summary });
    }
  };

  const handleTasks = async () => {
    setResult({ kind: "loading", label: "Extraction des tâches…" });
    const res = await suggestTasks(conversationId);
    if (res.error) {
      setResult({ kind: "error", message: res.error });
    } else if (res.tasks.length === 0) {
      setResult({
        kind: "error",
        message: "Aucune action concrète détectée dans cette conversation.",
      });
    } else {
      setResult({ kind: "tasks", data: res.tasks });
    }
  };

  const runTranslation = async (langLabel: string) => {
    setLangPickerOpen(false);
    setResult({ kind: "loading", label: `Traduction en ${langLabel}…` });
    const res = await translateThread(conversationId, langLabel);
    if (res.error || res.messages.length === 0) {
      setResult({ kind: "error", message: res.error ?? "Aucune traduction" });
    } else {
      setResult({ kind: "translation", data: res.messages, lang: langLabel });
    }
  };

  const taskKey = (t: SuggestedTask) => `${t.title}::${t.priority}::${t.due ?? "no-due"}`;

  // Create a task from an inline scan suggestion — the capability the old
  // MuePanel held, moved here so task-creation lives where you read the mail.
  const handleCreateTask = async (t: SuggestedTask) => {
    const key = taskKey(t);
    if (createdKeys.has(key) || creatingKey === key) return;
    setCreatingKey(key);
    try {
      const res = await createTask({
        title: t.title,
        priority: t.priority,
        due: t.due,
        conversationId,
      });
      if (res.ok) {
        setCreatedKeys((prev) => new Set(prev).add(key));
        push({ kind: "info", text: `Tâche créée : ${t.title.slice(0, 50)}`, duration: 2500 });
        router.refresh();
      } else {
        push({ kind: "error", text: res.error ?? "Création impossible." });
      }
    } catch (err) {
      push({ kind: "error", text: err instanceof Error ? err.message : "Création impossible." });
    } finally {
      setCreatingKey((prev) => (prev === key ? null : prev));
    }
  };

  return (
    <div className="thread-ai-bar">
      <div className="thread-ai-actions">
        <button
          type="button"
          className="thread-ai-btn"
          onClick={handleSummary}
          disabled={result?.kind === "loading"}
        >
          <Icon name="i-list" /> Résumer
        </button>
        <button
          type="button"
          className="thread-ai-btn"
          onClick={handleTasks}
          disabled={result?.kind === "loading"}
        >
          <Icon name="i-spark" /> Tâches
        </button>
        <button
          type="button"
          className={`thread-ai-btn ${langPickerOpen ? "is-active" : ""}`}
          onClick={() => setLangPickerOpen((o) => !o)}
          aria-expanded={langPickerOpen}
          disabled={result?.kind === "loading"}
        >
          <Icon name="i-globe" /> Traduire
          <span className="thread-ai-chevron" aria-hidden>
            {langPickerOpen ? "▴" : "▾"}
          </span>
        </button>
        {result && (
          <button
            type="button"
            className="thread-ai-close"
            onClick={() => setResult(null)}
            aria-label="Fermer le résultat Mue"
          >
            ✕
          </button>
        )}
      </div>

      {langPickerOpen && (
        <div className="thread-ai-lang" role="menu">
          {TRANSLATE_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitem"
              className="thread-ai-lang-option"
              onClick={() => {
                void runTranslation(l.label);
                push({ text: `Mue traduit en ${l.label}…`, duration: 1600 });
              }}
            >
              <span aria-hidden>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      )}

      {result && result.kind === "loading" && (
        <div className="thread-ai-result is-loading">
          <span className="mue-result-spinner" /> {result.label}
        </div>
      )}
      {result && result.kind === "error" && (
        <div className="thread-ai-result is-error">{result.message}</div>
      )}
      {result && result.kind === "summary" && (
        <div className="thread-ai-result">
          <p className="thread-ai-tldr">{result.data.tldr}</p>
          <ul className="thread-ai-bullets">
            {result.data.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {result && result.kind === "tasks" && (
        <ul className="thread-ai-result thread-ai-tasks">
          {result.data.map((t) => {
            const key = taskKey(t);
            const created = createdKeys.has(key);
            return (
              <li key={key} className={`mue-task is-${t.priority}`}>
                <span className="mue-task-priority" />
                <span className="mue-task-title">{t.title}</span>
                {t.due && <span className="mue-task-due">{t.due}</span>}
                <button
                  type="button"
                  className={`mue-action-confirm ${created ? "is-done" : ""}`}
                  style={{ flexShrink: 0 }}
                  onClick={() => void handleCreateTask(t)}
                  disabled={created || creatingKey === key}
                >
                  {created ? "✓ Créée" : creatingKey === key ? "…" : "Créer la tâche"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {result && result.kind === "translation" && (
        <div className="thread-ai-result thread-ai-translation">
          {result.data.map((m) => (
            <div
              key={`${m.sender}-${m.date}-${m.translated.slice(0, 40)}`}
              className="mue-translated-msg"
            >
              <div className="mue-translated-meta">
                <strong>{m.sender}</strong>
                <span>
                  {new Date(m.date).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p>{m.translated}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailCard({
  message,
  fallbackName,
  fallbackAvatar,
}: {
  message: Message;
  fallbackName: string;
  fallbackAvatar: import("@/lib/types").Avatar | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const name = message.senderName || fallbackName;
  const email = message.senderEmail || "";
  const avatarSrc =
    message.senderAvatarUrl ||
    (fallbackAvatar && fallbackAvatar.kind === "img" ? fallbackAvatar.src : null);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") ||
    (email[0]?.toUpperCase() ?? "?");

  const hasHtml = !!message.bodyHtml && message.bodyHtml.length > 50;

  // Strip the long auto-footers (=== separator, "View this email in browser"…)
  // for a tighter preview. Keep the first ~80 lines / 4000 chars max.
  const cleaned = cleanEmailBody(message.text || "");

  return (
    <article className={`email-card ${message.dir === "out" ? "is-out" : ""}`}>
      <header className="email-card-head">
        <div className="email-card-avatar">
          {avatarSrc && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="email-card-meta">
          <div className="email-card-line">
            <span className="email-card-name">{name}</span>
            {email && <span className="email-card-email">&lt;{email}&gt;</span>}
          </div>
          <div className="email-card-date">{message.dateLong || message.time}</div>
        </div>
      </header>
      <div className="email-card-body">
        {/* Render BOTH text and html when both exist. The text shows
            instantly while the HTML iframe loads — and serves as a
            fallback if DOMPurify fails to load client-side. Previously
            the right panel could stay blank forever when the iframe
            never rendered. */}
        {cleaned && <pre style={{ marginBottom: hasHtml ? 16 : 0 }}>{cleaned}</pre>}
        {hasHtml && <EmailHtmlBody html={message.bodyHtml as string} />}
        {!cleaned && !hasHtml && (
          <p style={{ opacity: 0.5, fontStyle: "italic" }}>(Aucun contenu textuel)</p>
        )}
      </div>
    </article>
  );
}

const SIGNATURE_SEP = "\n\n-- \n";

function EmailComposer({
  conversationId,
  toName,
  contactEmail,
  autoDraft,
}: {
  conversationId: string;
  toName: string;
  contactEmail: string | null;
  autoDraft: boolean;
}) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  // Signature lives in component state (not a module-level cache) so it
  // can't leak between users on a shared device. When user A signs out,
  // the EmailComposer instance unmounts and the state is collected; the
  // next sign-in mounts a fresh component with a fresh fetch.
  const [signature, setSignature] = useState("");
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mue — AI reply suggestions
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [tonePending, setTonePending] = useState<MueTone | null>(null);
  const [autoDrafting, setAutoDrafting] = useState(false);
  const [draftedByMue, setDraftedByMue] = useState(false);

  // User-saved reply templates. Lazy-loaded the first time the user opens
  // the picker (no network on every conv switch) — then kept in memory
  // for the session.
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Fetch the signature ONCE per component lifecycle. The Composer mounts
  // when the user enters /app and unmounts on sign-out → no cross-user
  // leak (which the module-level cache used to have).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sig = await getEmailSignature();
        if (!cancelled) {
          setSignature(sig);
          setSignatureLoaded(true);
        }
      } catch {
        if (!cancelled) setSignatureLoaded(true); // mark loaded even on error so the conv-switch effect can run with empty sig
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset suggestions + pre-fill body with the signature whenever the
  // user switches to a different conv. We prefill (rather than appending
  // on send) so the user sees exactly what will be sent and can tweak it.
  // signature is NOT in the deps — that's intentional: if the user edits
  // their sig in Settings mid-draft, the draft shouldn't be wiped. The
  // dedicated "signature-updated" listener below handles that case
  // conditionally (only updates body if it was still empty/just-the-sig).
  // biome-ignore lint/correctness/useExhaustiveDependencies: Signature is intentionally omitted so editing settings never wipes an in-progress draft.
  useEffect(() => {
    setSuggestions([]);
    if (!signatureLoaded || !conversationId) return; // Wait for first fetch; avoids a "" → sig flash.
    setBody(signature ? `${SIGNATURE_SEP}${signature}` : "");
  }, [conversationId, signatureLoaded]);

  // Auto-brouillon Mue : à l'ouverture d'un fil où le client attend ma
  // réponse, Mue pré-charge un brouillon dans MON style — pas un bouton à
  // cliquer. N'écrase jamais un brouillon déjà commencé.
  // biome-ignore lint/correctness/useExhaustiveDependencies: signature volontairement hors deps.
  useEffect(() => {
    setDraftedByMue(false);
    if (!autoDraft || !signatureLoaded || !conversationId) return;
    let cancelled = false;
    setAutoDrafting(true);
    suggestReplies(conversationId)
      .then((res) => {
        if (cancelled) return;
        const first = res.suggestions?.[0];
        if (!first) return;
        setBody((prev) => {
          const justSig =
            prev.trim() === "" || (!!signature && prev === `${SIGNATURE_SEP}${signature}`);
          if (!justSig) return prev;
          return signature ? `${first.text}${SIGNATURE_SEP}${signature}` : first.text;
        });
        setDraftedByMue(true);
      })
      .finally(() => {
        if (!cancelled) setAutoDrafting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, signatureLoaded, autoDraft]);

  // Close the templates menu on outside-click or Escape.
  useEffect(() => {
    if (!templatesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTemplatesOpen(false);
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".email-composer-templates-wrap")) return;
      setTemplatesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Defer so the open click doesn't immediately close.
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
      clearTimeout(t);
    };
  }, [templatesOpen]);

  // Listen for TemplatesManager mutations so the composer cache stays in
  // sync without a page reload.
  useEffect(() => {
    const onChanged = () => {
      setTemplates(null); // Force re-fetch on next open.
    };
    window.addEventListener("freescale:templates-changed", onChanged);
    return () => window.removeEventListener("freescale:templates-changed", onChanged);
  }, []);

  // Listen for ProfileForm saves so the composer reflects an in-session
  // signature edit without a page reload. The body only auto-refreshes
  // if the user's draft is still just the previous signature (i.e. they
  // haven't typed anything) — otherwise we'd nuke a half-written reply.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail ?? "";
      setSignature(detail);
      setBody((prev) => {
        const isJustSignature =
          prev.trim() === "" || (signature && prev === `${SIGNATURE_SEP}${signature}`);
        if (isJustSignature) return detail ? `${SIGNATURE_SEP}${detail}` : "";
        return prev;
      });
    };
    window.addEventListener("freescale:signature-updated", onUpdate);
    return () => window.removeEventListener("freescale:signature-updated", onUpdate);
  }, [signature]);

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const result = await suggestReplies(conversationId);
      if (result.error) {
        push({
          text: `Mue : ${result.error}`,
          duration: 5000,
        });
        return;
      }
      if (result.suggestions.length === 0) {
        push({ text: "Mue n'a pas pu générer de suggestions.", duration: 3000 });
        return;
      }
      setSuggestions(result.suggestions);
    } catch (err) {
      push({
        text: err instanceof Error ? err.message : "Mue est indisponible.",
        duration: 5000,
      });
    } finally {
      setSuggesting(false);
    }
  };

  const splitSignatureFromDraft = () => {
    const suffix = signature ? `${SIGNATURE_SEP}${signature}` : "";
    if (suffix && body.endsWith(suffix)) {
      return {
        draft: body.slice(0, -suffix.length).trimEnd(),
        suffix,
      };
    }
    return { draft: body, suffix: "" };
  };

  const handleToneRewrite = async (tone: MueTone) => {
    const { draft, suffix } = splitSignatureFromDraft();
    if (!draft.trim()) {
      push({ text: "Écrivez un brouillon avant de changer le ton.", duration: 3000 });
      return;
    }
    setTonePending(tone);
    try {
      const result = await rewriteDraftTone({
        conversationId,
        text: draft,
        tone,
      });
      if (result.error || !result.text) {
        push({ text: result.error ?? "Réécriture impossible.", duration: 5000 });
        return;
      }
      setBody(suffix ? `${result.text}${suffix}` : result.text);
    } catch (err) {
      push({
        text: err instanceof Error ? err.message : "Réécriture impossible.",
        duration: 5000,
      });
    } finally {
      setTonePending(null);
    }
  };

  const openTemplates = async () => {
    // Toggle close if already open. Lazy-load on first open.
    if (templatesOpen) {
      setTemplatesOpen(false);
      return;
    }
    if (templates === null) {
      setTemplatesLoading(true);
      try {
        const list = await listEmailTemplates();
        setTemplates(list);
      } catch {
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    }
    setTemplatesOpen(true);
  };

  const insertTemplate = (t: EmailTemplate) => {
    // Replace template variables with their concrete values:
    //   {{firstName}}  — first token of the contact's name
    //   {{lastName}}   — remaining tokens of the contact's name (may be empty)
    //   {{fullName}}   — full contact name
    //   {{date}}       — today's date in the user's locale (long format)
    //   {{time}}       — current time HH:MM (24h)
    // Unknown variables are left as-is so the user spots typos. Then
    // append the signature so it survives the template swap.
    const first = toName.split(/[ –-]/)[0]?.trim() ?? "";
    const rest = toName.slice(first.length).trim();
    const now = new Date();
    const date = now.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const replaced = t.body
      .replace(/\{\{\s*firstName\s*\}\}/gi, first)
      .replace(/\{\{\s*lastName\s*\}\}/gi, rest)
      .replace(/\{\{\s*fullName\s*\}\}/gi, toName)
      .replace(/\{\{\s*date\s*\}\}/gi, date)
      .replace(/\{\{\s*time\s*\}\}/gi, time);
    setBody(signature ? `${replaced}${SIGNATURE_SEP}${signature}` : replaced);
    setTemplatesOpen(false);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed && files.length === 0) {
      push({ text: "Le message est vide." });
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("conversationId", conversationId);
      fd.append("text", trimmed);
      if (cc.trim()) fd.append("cc", cc.trim());
      for (const f of files) fd.append("files", f);

      await sendEmailReply(fd);
      push({ text: "Email envoyé ✉", duration: 3000 });
      // Reset back to a fresh draft with just the signature, so the
      // next reply opens ready-to-type.
      setBody(signature ? `${SIGNATURE_SEP}${signature}` : "");
      setCc("");
      setShowCc(false);
      setFiles([]);
      // Refresh server data so the new message appears in the thread.
      // (Combined with DataProvider's useEffect on initial props.)
      router.refresh();
    } catch (err) {
      push({
        text: err instanceof Error ? err.message : "Envoi impossible.",
        duration: 5000,
      });
    } finally {
      setSending(false);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="email-composer">
      <div className="email-composer-headers">
        <div className="email-composer-row">
          <span className="email-composer-label">À</span>
          <span className="email-composer-value">
            {toName}
            {contactEmail ? (
              <span className="email-composer-email"> &lt;{contactEmail}&gt;</span>
            ) : null}
          </span>
          {!showCc && (
            <button type="button" className="email-composer-toggle" onClick={() => setShowCc(true)}>
              Cc
            </button>
          )}
        </div>
        {showCc && (
          <div className="email-composer-row">
            <span className="email-composer-label">Cc</span>
            <input
              type="text"
              className="email-composer-cc"
              placeholder="email1@…, email2@…"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
            <button
              type="button"
              className="email-composer-toggle"
              onClick={() => {
                setShowCc(false);
                setCc("");
              }}
              aria-label="Retirer Cc"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mue-suggestions">
          <span className="mue-suggestions-label">
            <Icon name="i-spark" />
            Mue suggère
          </span>
          {suggestions.map((s) => (
            <button
              key={`${s.label}-${s.text}`}
              type="button"
              className="mue-suggestion-chip"
              onClick={() => {
                // Insert the suggestion above the signature so the user
                // doesn't lose their auto-appended sig when picking a
                // Mue-generated reply.
                setBody(signature ? `${s.text}${SIGNATURE_SEP}${signature}` : s.text);
                setSuggestions([]);
              }}
              title={s.text}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="mue-suggestion-dismiss"
            onClick={() => setSuggestions([])}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      {(autoDrafting || draftedByMue) && (
        <div className={`mue-draft-flag ${autoDrafting ? "is-loading" : ""}`}>
          <Icon name="i-spark" />
          <span>
            {autoDrafting
              ? "Mue rédige ton brouillon…"
              : "Brouillon de Mue · à relire avant d'envoyer"}
          </span>
        </div>
      )}

      <textarea
        className="email-composer-body"
        placeholder={`Votre réponse à ${toName}…`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleSend();
          }
        }}
        rows={4}
      />

      {files.length > 0 && (
        <div className="email-composer-files">
          {files.map((f, idx) => (
            <span key={`${f.name}-${f.size}-${f.lastModified}`} className="email-composer-file">
              <Icon name="i-clip" />
              <span>{f.name}</span>
              <em>{(f.size / 1024).toFixed(0)} Ko</em>
              <button type="button" aria-label="Retirer" onClick={() => removeFile(idx)}>
                ✕
              </button>
            </span>
          ))}
          <span className="email-composer-total">
            Total : {(totalSize / 1024 / 1024).toFixed(2)} Mo (max 25 Mo)
          </span>
        </div>
      )}

      <div className="email-composer-actions">
        <button
          type="button"
          className="email-composer-attach"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
        >
          <Icon name="i-clip" />
          Joindre
        </button>
        <div className="email-composer-templates-wrap">
          <button
            type="button"
            className="email-composer-templates"
            onClick={openTemplates}
            disabled={sending}
            aria-expanded={templatesOpen}
            title="Insérer un modèle de réponse"
          >
            <Icon name="i-edit" />
            Modèles
          </button>
          {templatesOpen && (
            <div className="templates-menu" role="menu">
              {templatesLoading && <div className="templates-menu-empty">Chargement…</div>}
              {!templatesLoading && templates && templates.length === 0 && (
                <div className="templates-menu-empty">
                  Aucun modèle. Créez-en dans Paramètres → Modèles.
                </div>
              )}
              {!templatesLoading &&
                templates &&
                templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="templates-menu-item"
                    role="menuitem"
                    onClick={() => insertTemplate(t)}
                  >
                    <span className="templates-menu-name">{t.name}</span>
                    <span className="templates-menu-preview">
                      {t.body.replace(/\s+/g, " ").slice(0, 60) || "Modèle vide"}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="email-composer-mue"
          onClick={handleSuggest}
          disabled={suggesting || sending}
          title="Mue génère 3 propositions de réponse contextuelles"
        >
          <Icon name="i-spark" />
          {suggesting ? "Mue réfléchit…" : "Suggérer (Mue)"}
        </button>
        <div className="email-composer-tone" aria-label="Changer le ton avec Mue">
          {[
            ["formal", "Formal"],
            ["casual", "Casual"],
            ["friendly", "Friendly"],
          ].map(([tone, label]) => (
            <button
              key={tone}
              type="button"
              onClick={() => handleToneRewrite(tone as MueTone)}
              disabled={sending || suggesting || tonePending !== null}
            >
              {tonePending === tone ? "…" : label}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="email-composer-send"
          onClick={handleSend}
          disabled={sending || (!body.trim() && files.length === 0)}
        >
          <Icon name="i-send" />
          {sending ? "Envoi…" : "Envoyer l'email"}
        </button>
      </div>
    </div>
  );
}
