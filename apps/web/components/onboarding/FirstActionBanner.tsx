"use client";

import { type DailyBriefing, dailyBriefing } from "@/lib/actions/mue";
import { classifyAllUncategorized } from "@/lib/actions/triage";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * "Voici ce qui mérite votre attention" — the audit-mandated guided
 * first action that closes the onboarding loop. Appears ONCE after
 * the user has answered/dismissed the soft profiling chips, offering
 * three concrete CTAs to take their first action on the new inbox:
 *
 *   1. "Trier ma boîte avec Mue"   → classifyAllUncategorized() (categorise into tabs)
 *   2. "Demander le brief du jour"  → dailyBriefing() (inline action items)
 *   3. "Explorer par moi-même"     → dismiss
 *
 * Dismiss state lives in localStorage (per-browser key) so we don't
 * round-trip the DB just to silence a one-shot banner. The card also
 * auto-dismisses after any of the two productive CTAs completes,
 * because by that point the user is clearly engaged and the banner
 * has done its job.
 */

const STORAGE_KEY = "fs:first-action-banner:dismissed";

export function FirstActionBanner({
  firstName,
  conversationCount,
}: {
  firstName: string;
  conversationCount: number;
}) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();
  const [brief, setBrief] = useState<DailyBriefing | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      // Private mode / storage disabled — default to showing once per
      // page-load. Worst case the user sees it on every fresh load
      // until they dismiss, but no functional break.
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  const handleTriage = () => {
    startTransition(async () => {
      try {
        const res = await classifyAllUncategorized();
        if (res.classified > 0) {
          push({
            text: `Mue a trié ${res.classified} conversation${res.classified > 1 ? "s" : ""}.`,
            duration: 2600,
          });
        } else if (res.errors.length > 0) {
          push({ text: `Erreur : ${res.errors[0]?.slice(0, 80)}` });
        }
        router.refresh();
      } catch (err) {
        push({ text: err instanceof Error ? err.message : "Triage impossible." });
      } finally {
        dismiss();
      }
    });
  };

  const handleBrief = () => {
    startTransition(async () => {
      try {
        const res = await dailyBriefing();
        if (res.briefing) {
          setBrief(res.briefing);
        } else {
          push({ text: res.error ?? "Brief indisponible.", duration: 3000 });
        }
      } catch (err) {
        push({ text: err instanceof Error ? err.message : "Brief impossible." });
      }
    });
  };

  if (!visible) return null;

  return (
    <section className="first-action" aria-label="Action guidée">
      <header className="first-action-head">
        <div className="first-action-orb" aria-hidden>
          <span className="first-action-core" />
        </div>
        <div className="first-action-text">
          <h3 className="first-action-title">Bienvenue dans Freescale, {firstName}.</h3>
          <p className="first-action-sub">
            {conversationCount > 0
              ? `${conversationCount} conversation${conversationCount > 1 ? "s" : ""} chargée${conversationCount > 1 ? "s" : ""}. Voici comment Mue peut aider.`
              : "Découvrons ensemble votre inbox."}
          </p>
        </div>
        <button
          type="button"
          className="first-action-close"
          onClick={dismiss}
          disabled={pending}
          aria-label="Fermer"
        >
          ✕
        </button>
      </header>

      {!brief && (
        <div className="first-action-ctas">
          <button
            type="button"
            className="first-action-cta first-action-cta-primary"
            onClick={handleTriage}
            disabled={pending}
          >
            <SortIcon />
            <span>
              <strong>Trier ma boîte avec Mue</strong>
              <em>Range chaque conv en Clients / Promos / Notifs.</em>
            </span>
          </button>
          <button
            type="button"
            className="first-action-cta"
            onClick={handleBrief}
            disabled={pending}
          >
            <SparkIcon />
            <span>
              <strong>Voir le brief du jour</strong>
              <em>Mue résume vos actions importantes.</em>
            </span>
          </button>
          <button
            type="button"
            className="first-action-cta first-action-cta-quiet"
            onClick={dismiss}
            disabled={pending}
          >
            <InboxIcon />
            <span>
              <strong>Explorer par moi-même</strong>
              <em>Je découvre l'inbox tranquille.</em>
            </span>
          </button>
        </div>
      )}

      {brief && (
        <div className="first-action-brief">
          <p className="first-action-brief-headline">{brief.headline}</p>
          {brief.items.length > 0 && (
            <ul className="first-action-brief-list">
              {brief.items.slice(0, 3).map((it) => (
                <li
                  key={`${it.title}-${it.contactName}-${it.priority}`}
                  className={`first-action-brief-item is-${it.priority}`}
                >
                  <span className="first-action-brief-dot" />
                  <div>
                    <div className="first-action-brief-title">{it.title}</div>
                    <div className="first-action-brief-who">{it.contactName}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="first-action-cta first-action-cta-primary first-action-cta-full"
            onClick={dismiss}
          >
            Continuer dans l'inbox
          </button>
        </div>
      )}
    </section>
  );
}

// ────────── Inline icons (keeps bundle small, no extra deps)

function SortIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
