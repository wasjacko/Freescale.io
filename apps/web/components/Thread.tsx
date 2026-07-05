"use client";

import { EmailHtmlBody } from "@/components/EmailHtmlBody";
import { TagPopover } from "@/components/TagPopover";
import { ChannelLogo, Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import {
  type ConversationCollaboration,
  createInternalNote,
  listConversationCollaboration,
} from "@/lib/actions/collaboration";
import { type EmailTemplate, listEmailTemplates } from "@/lib/actions/email-templates";
import { simulateEmailThread } from "@/lib/simulateEmailThread";
import { ClientDetailsModal } from "@/components/ClientDetailsModal";
import { ComposerBar } from "@/components/ComposerBar";
import { FormatToolbar } from "@/components/FormatToolbar";
import { createTask, sendEmailReply } from "@/lib/actions/inbox";
import {
  type ReplySuggestion,
  type SuggestedTask,
  type ThreadSummary,
  type TranslatedMessage,
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
  const { activeConvId, setActiveConv, setView, setMueOpen, setMuePendingAction } = useApp();
  const {
    conversations,
    messagesByConv,
    appendOutgoingMessage,
    retryFailedMessage,
    setTags,
    markUnread,
    archive,
    toggleStar,
    setCategory,
    snooze,
  } = useData();
  // Section collaboration (notes internes + activité) — désormais inaccessible
  // depuis l'en-tête (icônes retirées) ; on garde l'état au cas où.
  const [collabOpen] = useState(false);
  // Fiche client : modale d'aperçu rapide sans changer de page.
  const [clientModalOpen, setClientModalOpen] = useState(false);
  // Composer compact au repos (1 ligne) — s'étend au focus.
  const [composerFocus, setComposerFocus] = useState(false);
  const conv = conversations.find((c) => c.id === activeConvId);
  const push = useToast((s) => s.push);

  const [input, setInput] = useState("");
  const messagesEl = useRef<HTMLElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const tagBtnRef = useRef<HTMLButtonElement>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagAnchor, setTagAnchor] = useState<DOMRect | null>(null);
  // Menus de la toolbar Gmail-like : catégorie + « plus d'actions ».
  const [catOpen, setCatOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Live-fetch messages from Gmail on conv open. messagesByConv (server
  // DB cache) used only as an INSTANT fallback for the conv we last
  // rendered — never leaks across conv switches (would show the wrong
  // thread's content for ~300ms while the new fetch resolved).
  const [liveByConv, setLiveByConv] = useState<Record<string, Message[]>>({});
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [collab, setCollab] = useState<ConversationCollaboration | null>(null);
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
    listConversationCollaboration(activeConvId).then((data) => {
      if (!cancelled) setCollab(data);
    });
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  const isLiveLoading = loadingConvId === activeConvId;

  // Strict per-conv lookup. NO fallback to messagesByConv across convs —
  // showing the wrong thread's content during a switch was the "loading
  // flash" bug.
  const messages = useMemo<Message[]>(() => {
    const live = liveByConv[activeConvId];
    const server = messagesByConv[activeConvId];
    // Démo : si on n'a pas un vrai échange (≥ 2 messages), on simule un fil
    // d'emails réaliste pour montrer à quoi ressemble Freescale.
    if (live && live.length >= 2) return live;
    if (server && server.length >= 2) return server;
    if (conv) return simulateEmailThread(conv);
    return live ?? server ?? [];
  }, [liveByConv, messagesByConv, activeConvId, conv]);
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
                  <circle cx="160" cy="108" r="34" />
                </clipPath>
                <clipPath id="fs-av-2">
                  <circle cx="448" cy="104" r="25" />
                </clipPath>
                <clipPath id="fs-av-3">
                  <circle cx="165" cy="244" r="29" />
                </clipPath>
                <clipPath id="fs-av-4">
                  <circle cx="442" cy="246" r="22" />
                </clipPath>
              </defs>

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

              {/* Avatars réels (photos contacts) + pastille canal — tailles variées,
                  rapprochés de la boîte centrale */}
              <g>
                <image href="/avatars/1.webp" x="126" y="74" width="68" height="68"
                  clipPath="url(#fs-av-1)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="184" cy="132" r="10" fill="#25D366" stroke="#fff" strokeWidth="3" />

                <image href="/avatars/2.webp" x="423" y="79" width="50" height="50"
                  clipPath="url(#fs-av-2)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="466" cy="122" r="8" fill="#EA4335" stroke="#fff" strokeWidth="3" />

                <image href="/avatars/3.webp" x="136" y="215" width="58" height="58"
                  clipPath="url(#fs-av-3)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="185" cy="264" r="9" fill="#0A66C2" stroke="#fff" strokeWidth="3" />

                <image href="/avatars/4.webp" x="420" y="224" width="44" height="44"
                  clipPath="url(#fs-av-4)" preserveAspectRatio="xMidYMid slice" />
                <circle cx="458" cy="262" r="7.5" fill="#7B5CFF" stroke="#fff" strokeWidth="3" />
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
            Tous vos messages, quel que soit le canal, arrivent ici. Gérez vos canaux dans les{" "}
            <Link href="/app/settings/connections" className="thread-empty-link">
              Réglages de l'Inbox
            </Link>
            .
          </p>
        </div>
        <p className="thread-empty-secure" aria-label="Confidentialité">
          <svg
            viewBox="0 0 24 24"
            width={13}
            height={13}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Vos messages personnels sont{" "}
          <span className="thread-empty-secure-em">chiffrés de bout en bout</span>.
        </p>
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
      <header className="thread-head thread-head--toolbar">
        {/* Barre d'actions Gmail-like : retour + actions rapides à gauche,
            Fiche client + favori à droite. Contact info retiré (repose sur
            la ligne d'expéditeur du 1er email pour l'identification). */}
        <div className="thread-tb-left">
          <button
            type="button"
            className="thread-tb-btn thread-back"
            onClick={() => {
              setView("inbox");
              setActiveConv("");
            }}
            aria-label="Retour à l'inbox"
            title="Retour à l'inbox"
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className="thread-tb-btn"
            onClick={() => void markUnread(activeConvId)}
            aria-label="Marquer comme non lu"
            title="Marquer comme non lu"
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
              <path d="M4 7l8 6 8-6" />
            </svg>
          </button>
          <button
            type="button"
            className="thread-tb-btn"
            onClick={() => {
              const ordered = [...conversations].sort(
                (a, b) => new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime()
              );
              const idxNow = ordered.findIndex((c) => c.id === conv.id);
              const next = ordered.find((c, i) => i > idxNow && c.id !== conv.id);
              archive(conv.id);
              push({ kind: "success", text: "Conversation supprimée" });
              setActiveConv(next ? next.id : "");
            }}
            aria-label="Supprimer"
            title="Supprimer"
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            type="button"
            className="thread-tb-btn"
            onClick={() => {
              archive(conv.id);
              push({ kind: "success", text: "Conversation archivée" });
            }}
            aria-label="Archiver"
            title="Archiver"
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="4" rx="1" />
              <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
              <line x1="10" y1="13" x2="14" y2="13" />
            </svg>
          </button>
          <button
            ref={tagBtnRef}
            type="button"
            className={`thread-tb-btn ${tagOpen ? "is-on" : ""}`}
            onClick={() => {
              setTagAnchor(tagBtnRef.current?.getBoundingClientRect() ?? null);
              setTagOpen((v) => !v);
            }}
            aria-label="Étiquettes"
            title="Étiquettes"
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </button>
          <div className="thread-tb-menu-wrap">
            <button
              type="button"
              className={`thread-tb-btn ${catOpen ? "is-on" : ""}`}
              onClick={() => {
                setMoreOpen(false);
                setCatOpen((v) => !v);
              }}
              aria-label="Catégorie"
              aria-expanded={catOpen}
              title="Catégorie"
            >
              <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
              </svg>
            </button>
            {catOpen && (
              <>
                <button
                  type="button"
                  className="thread-tb-scrim"
                  aria-label="Fermer"
                  onClick={() => setCatOpen(false)}
                />
                <div className="thread-tb-menu" role="menu">
                  {(
                    [
                      { key: "client", label: "Client", dot: "#4f6cf7" },
                      { key: "prospect", label: "Prospect", dot: "#8b5cf6" },
                      { key: "prestataire", label: "Prestataire", dot: "#0891b2" },
                      { key: "collaborateur", label: "Collaborateur", dot: "#16a34a" },
                      { key: "promo", label: "Promo", dot: "#d97706" },
                      { key: "notif", label: "Notification", dot: "#94a3b8" },
                      { key: "other", label: "Autre", dot: "#6b7280" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`thread-tb-menu-item ${conv.category === opt.key ? "is-active" : ""}`}
                      onClick={() => {
                        void setCategory(conv.id, opt.key);
                        setCatOpen(false);
                        push({ kind: "success", text: `Catégorisé : ${opt.label}` });
                      }}
                    >
                      <span className="thread-tb-menu-dot" style={{ background: opt.dot }} />
                      {opt.label}
                    </button>
                  ))}
                  {conv.category && (
                    <>
                      <div className="thread-tb-menu-sep" />
                      <button
                        type="button"
                        className="thread-tb-menu-item"
                        onClick={() => {
                          void setCategory(conv.id, null);
                          setCatOpen(false);
                          push({ kind: "info", text: "Catégorie retirée" });
                        }}
                      >
                        <span className="thread-tb-menu-dot" style={{ background: "transparent", boxShadow: "inset 0 0 0 1.5px #94a3b8" }} />
                        Retirer la catégorie
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="thread-tb-menu-wrap">
            <button
              type="button"
              className={`thread-tb-btn ${moreOpen ? "is-on" : ""}`}
              onClick={() => {
                setCatOpen(false);
                setMoreOpen((v) => !v);
              }}
              aria-label="Plus d'actions"
              aria-expanded={moreOpen}
              title="Plus d'actions"
            >
              <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {moreOpen && (
              <>
                <button
                  type="button"
                  className="thread-tb-scrim"
                  aria-label="Fermer"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="thread-tb-menu" role="menu">
                  <button
                    type="button"
                    className="thread-tb-menu-item"
                    onClick={() => {
                      const t = new Date();
                      t.setDate(t.getDate() + 1);
                      t.setHours(9, 0, 0, 0);
                      void snooze(conv.id, t.toISOString());
                      setMoreOpen(false);
                      push({
                        kind: "info",
                        text: "En pause jusqu'à demain 9h",
                        action: { label: "Annuler", fn: () => void snooze(conv.id, null) },
                      });
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 7 12 12 15.5 14" />
                    </svg>
                    Reporter (demain 9h)
                  </button>
                  <button
                    type="button"
                    className="thread-tb-menu-item"
                    onClick={() => {
                      void setCategory(conv.id, "promo");
                      setMoreOpen(false);
                      push({
                        kind: "info",
                        text: "Marqué comme promo",
                        action: {
                          label: "Annuler",
                          fn: () => void setCategory(conv.id, null),
                        },
                      });
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2" />
                    </svg>
                    Marquer comme promo
                  </button>
                  <button
                    type="button"
                    className="thread-tb-menu-item"
                    onClick={() => {
                      if (typeof window !== "undefined") window.print();
                      setMoreOpen(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Imprimer
                  </button>
                  <button
                    type="button"
                    className="thread-tb-menu-item"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard
                          .writeText(conv.name)
                          .then(() =>
                            push({ kind: "success", text: "Nom du contact copié" })
                          )
                          .catch(() =>
                            push({ kind: "error", text: "Copie impossible." })
                          );
                      }
                      setMoreOpen(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copier le nom du contact
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="thread-tb-right">
          {linkedClient && (
            <button
              type="button"
              className="thread-client-btn"
              onClick={() => setClientModalOpen(true)}
              aria-label="Voir la fiche client"
              title="Voir la fiche client"
            >
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Fiche client</span>
            </button>
          )}
          <button
            type="button"
            className={`thread-tb-btn thread-tb-star ${conv.starred ? "is-on" : ""}`}
            onClick={() => void toggleStar(conv.id, !conv.starred)}
            aria-label={conv.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={conv.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill={conv.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9 12 2" />
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

      {!isEmail && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px", position: "relative", zIndex: 10 }}>
          <div className="thread-mue-quick-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              className="thread-ai-btn"
              onClick={() => {
                setMuePendingAction("Résume ce fil de discussion");
                setMueOpen(true);
              }}
            >
              <Icon name="i-list" /> Résumer le fil
            </button>
            <button
              type="button"
              className="thread-ai-btn"
              onClick={() => {
                setMuePendingAction(`Quelles sont mes nouvelles tâches pour le client ${conv.name} ?`);
                setMueOpen(true);
              }}
            >
              <Icon name="i-spark" /> Suggérer des tâches
            </button>
            <button
              type="button"
              className="thread-ai-btn"
              onClick={() => {
                setMuePendingAction("Suggère une réponse à ce fil");
                setMueOpen(true);
              }}
            >
              <Icon name="i-spark" /> Suggérer une réponse
            </button>
          </div>
        </div>
      )}

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
            <ComposerBar
              onAttach={() =>
                push({ kind: "info", text: "Pièces jointes sur ce canal — bientôt 👋" })
              }
              onMue={() =>
                setInput(
                  `Merci pour ton message ${firstName} — je te reviens avec une réponse détaillée d'ici la fin de journée.`
                )
              }
              onSend={handleSend}
              onMic={() => push({ kind: "info", text: "Dictée vocale — bientôt 👋" })}
              canSend={!!input.trim()}
            />
          </div>
        )}
      </footer>

      <ClientDetailsModal
        client={linkedClient ?? null}
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
      />
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
        </div>
        <div className="email-card-date">{message.dateLong || message.time}</div>
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
  const [, setSuggesting] = useState(false);
  const [, setAutoDrafting] = useState(false);
  const [, setDraftedByMue] = useState(false);

  // User-saved reply templates. Lazy-loaded the first time the user opens
  // the picker (no network on every conv switch) — then kept in memory
  // for the session.
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

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

      {formatOpen && <FormatToolbar />}

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

      <div className="email-composer-templates-wrap" style={{ position: "relative" }}>
        <ComposerBar
          onFormat={() => setFormatOpen((prev) => !prev)}
          formatOpen={formatOpen}
          onAttach={() => fileRef.current?.click()}
          onMue={handleSuggest}
          onTemplate={openTemplates}
          onSend={handleSend}
          onMic={() => push({ kind: "info", text: "Dictée vocale — bientôt 👋" })}
          canSend={!sending && (body.trim().length > 0 || files.length > 0)}
        />
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
      </div>
    </div>
  );
}
