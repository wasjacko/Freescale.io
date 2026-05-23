import type { ChannelId } from "@/lib/types";

export type ChannelCapability = "oauth" | "sync" | "send" | "attachments" | "webhook";

export type ChannelProviderDefinition = {
  kind: ChannelId;
  label: string;
  ready: boolean;
  startPath: string | null;
  emailLike: boolean;
  syncable: boolean;
  capabilities: ChannelCapability[];
};

export const CHANNEL_PROVIDER_REGISTRY: ChannelProviderDefinition[] = [
  {
    kind: "gmail",
    label: "Gmail",
    ready: true,
    startPath: "/auth/gmail/start",
    emailLike: true,
    syncable: true,
    capabilities: ["oauth", "sync", "send", "attachments"],
  },
  {
    kind: "outlook",
    label: "Outlook",
    ready: true,
    startPath: "/auth/outlook/start",
    emailLike: true,
    syncable: true,
    capabilities: ["oauth", "sync", "send", "attachments"],
  },
  {
    kind: "icloud",
    label: "iCloud Mail",
    ready: false,
    startPath: null,
    emailLike: true,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "imap",
    label: "IMAP",
    ready: false,
    startPath: null,
    emailLike: true,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "slack",
    label: "Slack",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["oauth", "webhook"],
  },
  {
    kind: "instagram",
    label: "Instagram DMs",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "whatsapp",
    label: "WhatsApp",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "discord",
    label: "Discord",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["oauth", "sync", "send"],
  },
  {
    kind: "x",
    label: "X",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "linkedin",
    label: "LinkedIn",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "telegram",
    label: "Telegram",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "messenger",
    label: "Messenger",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
  {
    kind: "sms",
    label: "SMS",
    ready: false,
    startPath: null,
    emailLike: false,
    syncable: false,
    capabilities: ["sync", "send"],
  },
];

const PROVIDERS_BY_KIND = new Map(CHANNEL_PROVIDER_REGISTRY.map((p) => [p.kind, p]));

export function getChannelProvider(kind: string | null | undefined) {
  return kind ? PROVIDERS_BY_KIND.get(kind as ChannelId) : undefined;
}

export function channelProviderLabel(kind: string | null | undefined): string {
  return getChannelProvider(kind)?.label ?? "Canal";
}

export function isProviderReady(kind: string | null | undefined): boolean {
  return getChannelProvider(kind)?.ready ?? false;
}

export function isEmailLikeChannel(kind: string | null | undefined): kind is ChannelId {
  return getChannelProvider(kind)?.emailLike ?? false;
}

export function isSyncableChannel(kind: string | null | undefined): kind is ChannelId {
  return getChannelProvider(kind)?.syncable ?? false;
}

export function syncableChannelKinds(): ChannelId[] {
  return CHANNEL_PROVIDER_REGISTRY.filter((p) => p.syncable).map((p) => p.kind);
}
