export type MemberRole = "owner" | "admin" | "member";

export type ActivityEventType =
  | "assigned"
  | "unassigned"
  | "note_created"
  | "reply_sent"
  | "read"
  | "tag_changed"
  | "workspace_created"
  | "teammate_invited"
  | "teammate_joined"
  | string;

export type ActivityMetadata = {
  assigneeName?: string | null;
  tag?: string | null;
  email?: string | null;
};

export const DEFAULT_PERMISSION_ROLES = {
  invite: ["owner", "admin"] as MemberRole[],
  connectChannel: ["owner", "admin"] as MemberRole[],
  assign: ["owner", "admin", "member"] as MemberRole[],
};

export function normalizeWorkspaceName(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 64);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeInviteEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export function canManageWorkspace(role: MemberRole | null | undefined): boolean {
  return role === "owner";
}

export function canInviteTeammates(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canConnectChannels(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canAssignConversation(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function roleAllowed(
  role: MemberRole | null | undefined,
  allowedRoles: MemberRole[]
): boolean {
  if (role === "owner") return true;
  return !!role && allowedRoles.includes(role);
}

export function extractMentionHandles(body: string): string[] {
  const matches = body.match(/(^|\s)@([a-z0-9_.-]{2,40})/gi) ?? [];
  const handles = matches
    .map((match) =>
      match
        .replace(/^(\s*)@/, "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
  return Array.from(new Set(handles));
}

export function formatActivityEvent(
  type: ActivityEventType,
  actorName: string,
  metadata: ActivityMetadata
): string {
  const actor = actorName.trim() || "Un membre";
  switch (type) {
    case "assigned":
      return `${actor} a assigné la conversation à ${metadata.assigneeName || "un teammate"}.`;
    case "unassigned":
      return `${actor} a retiré l'assignation.`;
    case "note_created":
      return `${actor} a ajouté une note interne.`;
    case "reply_sent":
      return `${actor} a répondu au client.`;
    case "read":
      return `${actor} a lu la conversation.`;
    case "tag_changed":
      return `${actor} a mis à jour les tags.`;
    case "workspace_created":
      return `${actor} a créé le workspace.`;
    case "teammate_invited":
      return `${actor} a invité ${metadata.email || "un teammate"}.`;
    case "teammate_joined":
      return `${actor} a rejoint le workspace.`;
    default:
      return `${actor} a mis à jour la conversation.`;
  }
}
