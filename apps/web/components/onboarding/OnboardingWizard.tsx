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
    <div className="onb-overlay" role="dialog" aria-modal="true" aria-label="Onboarding">
      <div className="onb-card">
      <div className="onb-card-head">
        <div className="onb-mue">
          <MueAvatar />
        </div>
        <div className="onb-progress" aria-label={`Step ${idx + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`onb-dot ${i <= idx ? "is-on" : ""}`} />
          ))}
        </div>
        <div className="onb-step-tag">Step {idx + 1} of {STEPS.length}</div>
      </div>

      {step === "profile" && (
        <div className="onb-body">
          <h1 className="onb-title">Get started with your profile</h1>
          <p className="onb-sub">
            Create the face your team and contacts will see across Freescale.
          </p>

          <div className="onb-form">
            <div className="onb-row">
              <label className="onb-field">
                <span>First name</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Wacil"
                />
              </label>
              <label className="onb-field">
                <span>Last name</span>
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
                <div className="onb-avatar-help">Synced from your Google account.</div>
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
              Next
            </button>
          </div>
        </div>
      )}

      {step === "connect" && (
        <div className="onb-body">
          <h1 className="onb-title">Connect your first channel</h1>
          <p className="onb-sub">Which channel would you like to plug in first?</p>

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
            <button className="onb-btn" type="button" onClick={goBack}>Back</button>
            <button className="onb-btn onb-btn-primary" type="button" onClick={goNext}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === "import" && (
        <div className="onb-body">
          <h1 className="onb-title">Configure import options</h1>
          <p className="onb-sub">Tune how data flows in.</p>

          <div className="onb-form">
            <label className="onb-field">
              <span>Email import history</span>
              <select
                value={importHistory}
                onChange={(e) => setImportHistory(e.target.value)}
              >
                <option value="15d">15 days</option>
                <option value="1m">1 month</option>
                <option value="6m">6 months</option>
                <option value="1y">1 year</option>
                <option value="all">All time</option>
              </select>
            </label>
            <p className="onb-helper">
              Actual import is capped at 15 days during the trial. Upgrade to lift the limit.
            </p>

            <div className="onb-section-label">Should messages be shared?</div>
            <RadioCard
              checked={shared === true}
              onSelect={() => setShared(true)}
              icon="i-user"
              title="Yes, share this account"
              desc="Visible to teammates you invite to this workspace."
            />
            <RadioCard
              checked={shared === false}
              onSelect={() => setShared(false)}
              icon="i-lock"
              title="No, it's a personal account"
              desc="Private unless you explicitly share a thread."
            />
          </div>

          <div className="onb-actions">
            <button className="onb-btn" type="button" onClick={goBack}>Back</button>
            <button
              className="onb-btn onb-btn-primary"
              type="button"
              onClick={handleFinish}
              disabled={pending}
            >
              {pending ? "Finishing…" : "Enter Freescale"}
            </button>
          </div>
        </div>
      )}
      </div>
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
