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

type StepId = "profile" | "connect" | "trial" | "import";

const STEPS: StepId[] = ["profile", "connect", "trial", "import"];

export function OnboardingWizard({ initial }: { initial: Initial }) {
  const [step, setStep] = useState<StepId>("profile");
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [avatarUrl] = useState<string | null>(initial.avatarUrl);
  const [channel, setChannel] = useState<string>("gmail");
  const [importHistory, setImportHistory] = useState("1y");
  const [shared, setShared] = useState<boolean | null>(false);
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
        shared: shared ?? false,
      });
    });
  };

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() ||
    initial.email[0]?.toUpperCase() ||
    "?";

  return (
    <div className="onb-grid">
      <main className="onb-pane onb-left">
        <div className="onb-progress" aria-label={`Step ${idx + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`onb-dot ${i <= idx ? "is-on" : ""}`} />
          ))}
        </div>

        {step === "profile" && (
          <div className="onb-body">
            <h1 className="onb-title">Get started with your profile</h1>
            <p className="onb-sub">
              Freescale is your unified inbox with Mue, your AI copilot. Set up the face
              your team and contacts will see.
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
                    placeholder="Last"
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
                  <div className="onb-avatar-help">
                    Synced from your Google account. Custom uploads coming soon.
                  </div>
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
            <p className="onb-sub">Which channel would you like to plug into Freescale first?</p>

            <div className="onb-tabs">
              <button className="onb-tab is-active" type="button">Email</button>
              <button className="onb-tab" type="button" disabled>Messaging · soon</button>
            </div>

            <div className="onb-options">
              <ChannelOption
                id="gmail"
                title="Gmail or Google Workspace"
                logo={<ChannelLogo channel="gmail" />}
                active={channel === "gmail"}
                onClick={() => setChannel("gmail")}
                ready
              />
              <ChannelOption
                id="outlook"
                title="Outlook.com"
                logo={<div className="onb-mono-logo">O</div>}
                active={channel === "outlook"}
                onClick={() => setChannel("outlook")}
              />
              <ChannelOption
                id="office365"
                title="Office 365"
                logo={<div className="onb-mono-logo orange">O</div>}
                active={channel === "office365"}
                onClick={() => setChannel("office365")}
              />
              <ChannelOption
                id="imap"
                title="IMAP / SMTP"
                logo={<Icon name="i-inbox" />}
                active={channel === "imap"}
                onClick={() => setChannel("imap")}
              />
              <ChannelOption
                id="slack"
                title="Slack"
                logo={<ChannelLogo channel="slack" />}
                active={channel === "slack"}
                onClick={() => setChannel("slack")}
              />
              <ChannelOption
                id="instagram"
                title="Instagram DMs"
                logo={<ChannelLogo channel="instagram" />}
                active={channel === "instagram"}
                onClick={() => setChannel("instagram")}
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

        {step === "trial" && (
          <div className="onb-body onb-body-center">
            <h1 className="onb-title">Enjoy a free 30-day trial of Freescale Pro</h1>
            <p className="onb-sub">
              Explore every feature, including Mue&apos;s full intelligence, multi-channel sync,
              and unlimited AI Knowledge. Continue free or pick a plan when the trial ends.
            </p>

            <div className="onb-info">
              <span className="onb-info-icon"><Icon name="i-clock" /></span>
              <span>
                Until you upgrade, history is capped at <strong>15 days</strong> and the workspace
                supports <strong>3 teammates</strong> max.
              </span>
            </div>

            <div className="onb-actions onb-actions-stack">
              <button
                className="onb-btn onb-btn-primary onb-btn-block"
                type="button"
                onClick={goNext}
              >
                Start free trial
              </button>
              <button className="onb-btn onb-btn-quiet" type="button" onClick={goBack}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === "import" && (
          <div className="onb-body">
            <h1 className="onb-title">Configure import options</h1>
            <p className="onb-sub">Tune how data flows into your workspace.</p>

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
                On the free trial, actual import is capped at 15 days. Upgrade later to lift the limit.
              </p>

              <div className="onb-section-label">Should messages be shared?</div>
              <RadioCard
                checked={shared === true}
                onSelect={() => setShared(true)}
                icon="i-user"
                title="Yes, share this account"
                desc="Messages will be visible to teammates you invite to this workspace."
              />
              <RadioCard
                checked={shared === false}
                onSelect={() => setShared(false)}
                icon="i-lock"
                title="No, it's a personal account"
                desc="Messages will stay private unless you explicitly share them."
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
      </main>

      <aside className="onb-pane onb-right" aria-hidden="true">
        <PreviewPanel step={step} firstName={firstName} channel={channel} initials={initials} />
      </aside>
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
  id: string;
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

function PreviewPanel({
  step,
  firstName,
  channel,
  initials,
}: {
  step: StepId;
  firstName: string;
  channel: string;
  initials: string;
}) {
  return (
    <div className="onb-preview">
      <span className="onb-preview-pill">
        {step === "profile" && "Freescale features"}
        {step === "connect" && "Account type"}
        {step === "trial" && "What's inside"}
        {step === "import" && "Workspace"}
      </span>

      {step === "profile" && (
        <div className="onb-preview-card">
          <div className="onb-preview-row">
            <div className="onb-preview-av">{initials}</div>
            <div>
              <div className="onb-preview-name">{firstName || "You"}</div>
              <div className="onb-preview-meta">Freelance Designer</div>
            </div>
          </div>
          <div className="onb-preview-divider" />
          <div className="onb-preview-list">
            <div className="onb-preview-line">
              <span className="dot pink" /> Sarah Johnson <em>· Instagram</em>
              <strong>10:24 AM</strong>
            </div>
            <div className="onb-preview-line">
              <span className="dot blue" /> Acme Corp <em>· Gmail</em>
              <strong>9:15 AM</strong>
            </div>
            <div className="onb-preview-line">
              <span className="dot violet" /> Marketing Team <em>· Slack</em>
              <strong>Yesterday</strong>
            </div>
          </div>
          <div className="onb-preview-caption">
            <strong>Always know who&apos;s doing what.</strong>
            <span>See every channel, every conversation, in one inbox.</span>
          </div>
        </div>
      )}

      {step === "connect" && (
        <div className="onb-preview-card">
          <div className="onb-preview-channel-grid">
            {(["gmail", "instagram", "slack", "whatsapp", "discord"] as const).map((c) => (
              <div key={c} className={`onb-chip ${channel === c ? "is-on" : ""}`}>
                <ChannelLogo channel={c} />
                <span>{c}</span>
              </div>
            ))}
          </div>
          <div className="onb-preview-caption">
            <strong>See, read, and reply — all in one inbox.</strong>
            <span>Every channel is unified and threaded behind a single timeline.</span>
          </div>
        </div>
      )}

      {step === "trial" && (
        <div className="onb-preview-card onb-preview-trial">
          <div className="onb-trial-orb">
            <MueAvatar />
          </div>
          <div className="onb-trial-text">
            <strong>Mue is on you side.</strong>
            <span>
              Summaries, drafts, smart tasks. Mue listens to every conversation so you stay
              ahead — without sounding like a bot.
            </span>
          </div>
        </div>
      )}

      {step === "import" && (
        <div className="onb-preview-card">
          <div className="onb-preview-row onb-preview-stack">
            <span className="onb-preview-tag">
              <Icon name="i-user" /> Shared workspace
            </span>
            <span className="onb-preview-tag light">
              <Icon name="i-lock" /> Personal
            </span>
          </div>
          <div className="onb-preview-caption">
            <strong>Control who sees what.</strong>
            <span>
              Shared accounts power team collaboration. Personal ones keep everything to yourself
              unless you explicitly share a thread.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
