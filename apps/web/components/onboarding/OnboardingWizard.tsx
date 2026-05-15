"use client";

import { useState, useTransition } from "react";
import { MueAvatar } from "@/components/MueAvatar";
import { Icon, ChannelLogo } from "@/components/icons/Icon";
import { saveProfileStep, completeOnboarding } from "@/lib/actions/onboarding";

type Initial = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  email: string;
};

type StepId = "profile" | "connect" | "import";
const STEPS: StepId[] = ["profile", "connect", "import"];

export function OnboardingWizard({ initial }: { initial: Initial }) {
  const [step, setStep] = useState<StepId>("profile");
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [avatarUrl] = useState<string | null>(initial.avatarUrl);
  const [channel, setChannel] = useState<string>("gmail");
  const [importHistory, setImportHistory] = useState("1y");
  const [shared, setShared] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  const idx = STEPS.indexOf(step);
  const goNext = () => {
    const next = STEPS[idx + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = STEPS[idx - 1];
    if (prev) setStep(prev);
  };

  const handleNextFromProfile = () => {
    startTransition(async () => {
      await saveProfileStep(firstName.trim(), lastName.trim(), avatarUrl);
      goNext();
    });
  };

  const handleFinish = () => {
    startTransition(async () => {
      await completeOnboarding({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl,
        channelPick: channel,
        importHistory,
        shared,
      });
      // Hard navigation avoids any RSC cache mismatch between the onboarding
      // tree (which renders AppShell behind the modal) and the real "/" tree.
      window.location.href = "/app";
    });
  };

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() ||
    initial.email[0]?.toUpperCase() ||
    "?";

  return (
    <div className="onb-stage">
      <header className="onb-stage-head">
        <div className="onb-mue">
          <MueAvatar />
        </div>
        <span className="onb-step-tag">Étape {idx + 1} sur {STEPS.length}</span>
      </header>

      <main className="onb-stage-main">

      {step === "profile" && (
        <div className="onb-body">
          <h1 className="onb-title">Commençons par vous.</h1>
          <p className="onb-sub">
            Le visage que verront votre équipe et vos contacts dans Freescale.
          </p>

          <div className="onb-form">
            <div className="onb-row">
              <label className="onb-field">
                <span>Prénom</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Wacil"
                />
              </label>
              <label className="onb-field">
                <span>Nom</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ait"
                />
              </label>
            </div>

            <div className="onb-avatar-row">
              <div className="onb-avatar-disc">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="onb-avatar-meta">
                <div className="onb-avatar-title">Avatar</div>
                <div className="onb-avatar-help">Synchronisé depuis votre compte Google.</div>
              </div>
            </div>
          </div>

          <div className="onb-actions onb-actions-end">
            <button
              className="onb-btn onb-btn-primary"
              type="button"
              disabled={!firstName.trim() || pending}
              onClick={handleNextFromProfile}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === "connect" && (
        <div className="onb-body">
          <h1 className="onb-title">Connectez votre premier canal.</h1>
          <p className="onb-sub">Par quel canal voulez-vous commencer ?</p>

          <div className="onb-options">
            <ChannelOption
              title="Gmail or Google Workspace"
              logo={<ChannelLogo channel="gmail" />}
              active={channel === "gmail"}
              onClick={() => setChannel("gmail")}
              ready
            />
            <ChannelOption
              title="Outlook.com"
              logo={<div className="onb-mono-logo">O</div>}
              active={channel === "outlook"}
              onClick={() => setChannel("outlook")}
            />
            <ChannelOption
              title="Slack"
              logo={<ChannelLogo channel="slack" />}
              active={channel === "slack"}
              onClick={() => setChannel("slack")}
            />
            <ChannelOption
              title="Instagram DMs"
              logo={<ChannelLogo channel="instagram" />}
              active={channel === "instagram"}
              onClick={() => setChannel("instagram")}
            />
            <ChannelOption
              title="IMAP / SMTP"
              logo={<Icon name="i-inbox" />}
              active={channel === "imap"}
              onClick={() => setChannel("imap")}
            />
          </div>

          <div className="onb-actions">
            <button className="onb-btn" type="button" onClick={goBack}>Retour</button>
            <button className="onb-btn onb-btn-primary" type="button" onClick={goNext}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === "import" && (
        <div className="onb-body">
          <h1 className="onb-title">Vos préférences d&apos;import.</h1>
          <p className="onb-sub">Quelques réglages pour démarrer du bon pied.</p>

          <div className="onb-form">
            <label className="onb-field">
              <span>Historique à importer</span>
              <select
                value={importHistory}
                onChange={(e) => setImportHistory(e.target.value)}
              >
                <option value="15d">15 jours</option>
                <option value="1m">1 mois</option>
                <option value="6m">6 mois</option>
                <option value="1y">1 an</option>
                <option value="all">Tout l&apos;historique</option>
              </select>
            </label>
            <p className="onb-helper">
              Pendant la beta, l&apos;import réel est limité à 15 jours.
            </p>

            <div className="onb-section-label">Workspace partagé ou personnel ?</div>
            <RadioCard
              checked={shared === true}
              onSelect={() => setShared(true)}
              icon="i-user"
              title="Workspace partagé"
              desc="Visible par les coéquipiers que vous invitez."
            />
            <RadioCard
              checked={shared === false}
              onSelect={() => setShared(false)}
              icon="i-lock"
              title="Compte personnel"
              desc="Privé sauf si vous partagez explicitement un fil."
            />
          </div>

          <div className="onb-actions">
            <button className="onb-btn" type="button" onClick={goBack}>Retour</button>
            <button
              className="onb-btn onb-btn-primary"
              type="button"
              onClick={handleFinish}
              disabled={pending}
            >
              {pending ? "Finalisation…" : "Entrer dans Freescale"}
            </button>
          </div>
        </div>
      )}
      </main>

      <footer className="onb-stage-foot">
        <div className="onb-progress" aria-label={`Étape ${idx + 1} sur ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`onb-dot ${i <= idx ? "is-on" : ""}`} />
          ))}
        </div>
      </footer>
    </div>
  );
}

function ChannelOption({
  title,
  logo,
  active,
  ready,
  onClick,
}: {
  title: string;
  logo: React.ReactNode;
  active: boolean;
  ready?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`onb-option ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="onb-option-logo">{logo}</span>
      <span className="onb-option-title">{title}</span>
      <span className={`onb-option-tag ${ready ? "is-ready" : ""}`}>
        {ready ? "Ready" : "Soon"}
      </span>
    </button>
  );
}

function RadioCard({
  checked,
  onSelect,
  icon,
  title,
  desc,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      className={`onb-radio ${checked ? "is-active" : ""}`}
      onClick={onSelect}
    >
      <span className="onb-radio-icon"><Icon name={icon} /></span>
      <span className="onb-radio-body">
        <span className="onb-radio-title">{title}</span>
        <span className="onb-radio-desc">{desc}</span>
      </span>
      <span className={`onb-radio-mark ${checked ? "is-on" : ""}`} />
    </button>
  );
}
