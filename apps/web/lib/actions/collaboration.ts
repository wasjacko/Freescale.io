"use server";

import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "@/lib/app-url";
import {
  DEFAULT_PERMISSION_ROLES,
  type MemberRole,
  canInviteTeammates,
  canManageWorkspace,
  extractMentionHandles,
  normalizeInviteEmail,
  normalizeWorkspaceName,
  roleAllowed,
} from "@/lib/collaboration";
import { createClient } from "@/lib/supabase/server";
import { type WorkspaceSummary, resolveActiveWorkspace } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type TeamMember = {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: MemberRole;
  addedAt: string;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
};

export type TeamNotificationSettings = {
  slackWebhookUrl: string | null;
  emailDigestEnabled: boolean;
};

export type TeamNotification = {
  id: string;
  kind: "mention" | "assignment" | "invite";
  body: string;
  conversationId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type TeamPermissions = {
  canManageWorkspace: boolean;
  canInvite: boolean;
  canConnectChannels: boolean;
  canAssignConversation: boolean;
};

export type WorkspacePermissionRules = {
  inviteRoles: MemberRole[];
  connectChannelRoles: MemberRole[];
  assignRoles: MemberRole[];
};

export type TeamSettingsData = {
  activeWorkspaceId: string | null;
  currentRole: MemberRole | null;
  workspaces: WorkspaceSummary[];
  members: TeamMember[];
  invites: TeamInvite[];
  notifications: TeamNotificationSettings;
  notificationsForMe: TeamNotification[];
  permissionRules: WorkspacePermissionRules;
  permissions: TeamPermissions;
};

export type ConversationNote = {
  id: string;
  authorName: string;
  authorEmail: string;
  body: string;
  mentionHandles: string[];
  createdAt: string;
};

export type ConversationActivity = {
  id: string;
  actorName: string;
  actorEmail: string | null;
  eventType: string;
  body: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ConversationCollaboration = {
  assignedTo: string | null;
  members: TeamMember[];
  notes: ConversationNote[];
  activity: ConversationActivity[];
  permissions: TeamPermissions;
  error: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function rowProfile(row: Record<string, unknown>): Record<string, unknown> {
  const profile = row.profiles as Record<string, unknown> | Record<string, unknown>[] | null;
  return Array.isArray(profile) ? (profile[0] ?? {}) : (profile ?? {});
}

function mapMember(row: Record<string, unknown>): TeamMember {
  const profile = rowProfile(row);
  return {
    userId: String(profile.id ?? row.user_id ?? ""),
    email: String(profile.email ?? ""),
    fullName: (profile.full_name as string | null) ?? null,
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    role: (row.role as MemberRole) ?? "member",
    addedAt: String(row.added_at ?? new Date().toISOString()),
  };
}

async function requireActiveWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, workspace: null, workspaces: [] };
  const { workspace, workspaces } = await resolveActiveWorkspace(supabase, user.id);
  return { supabase, user, workspace, workspaces };
}

async function listMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
): Promise<TeamMember[]> {
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, role, added_at, profiles(id, email, full_name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("added_at", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map(mapMember);
}

async function sendInviteEmail(input: {
  to: string;
  workspaceName: string;
  inviteLink: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Freescale <hello@freescale.app>",
      html: `<div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#0f172a">
        <h1 style="font-size:24px">Invitation Freescale</h1>
        <p>Vous avez été invité à rejoindre <strong>${input.workspaceName}</strong>.</p>
        <p><a href="${input.inviteLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Rejoindre le workspace</a></p>
        <p style="color:#64748b;font-size:13px">Ce lien expire dans 14 jours.</p>
      </div>`,
      subject: `Invitation à rejoindre ${input.workspaceName} sur Freescale`,
      to: [input.to],
    }),
  });

  return response.ok;
}

async function readPermissionRules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
): Promise<WorkspacePermissionRules> {
  const { data } = await supabase
    .from("workspace_permission_settings")
    .select("invite_roles, connect_channel_roles, assign_roles")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const row = (data ?? null) as Record<string, unknown> | null;
  const parse = (value: unknown, fallback: MemberRole[]) =>
    Array.isArray(value)
      ? (value.filter((role) =>
          ["owner", "admin", "member"].includes(String(role))
        ) as MemberRole[])
      : fallback;
  return {
    inviteRoles: parse(row?.invite_roles, DEFAULT_PERMISSION_ROLES.invite),
    connectChannelRoles: parse(row?.connect_channel_roles, DEFAULT_PERMISSION_ROLES.connectChannel),
    assignRoles: parse(row?.assign_roles, DEFAULT_PERMISSION_ROLES.assign),
  };
}

function permissionsFor(role: MemberRole, rules: WorkspacePermissionRules): TeamPermissions {
  return {
    canManageWorkspace: canManageWorkspace(role),
    canInvite: roleAllowed(role, rules.inviteRoles),
    canConnectChannels: roleAllowed(role, rules.connectChannelRoles),
    canAssignConversation: roleAllowed(role, rules.assignRoles),
  };
}

async function notifySlack(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  text: string
): Promise<void> {
  const { data } = await supabase
    .from("team_notification_settings")
    .select("slack_webhook_url")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const webhookUrl = (data as Record<string, unknown> | null)?.slack_webhook_url as
    | string
    | null
    | undefined;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Notification delivery must never block the collaboration action.
  }
}

export async function getTeamSettingsData(): Promise<TeamSettingsData> {
  const { supabase, user, workspace, workspaces } = await requireActiveWorkspace();
  if (!user || !workspace) {
    return {
      activeWorkspaceId: null,
      currentRole: null,
      workspaces: [],
      members: [],
      invites: [],
      notifications: { slackWebhookUrl: null, emailDigestEnabled: false },
      notificationsForMe: [],
      permissionRules: {
        inviteRoles: DEFAULT_PERMISSION_ROLES.invite,
        connectChannelRoles: DEFAULT_PERMISSION_ROLES.connectChannel,
        assignRoles: DEFAULT_PERMISSION_ROLES.assign,
      },
      permissions: {
        canManageWorkspace: false,
        canInvite: false,
        canConnectChannels: false,
        canAssignConversation: false,
      },
    };
  }

  const database = supabase;
  const [members, invitesRes, notificationsRes, notificationsForMeRes, permissionRules] =
    await Promise.all([
      listMembers(supabase, workspace.id),
      database
        .from("workspace_invites")
        .select("id, email, role, expires_at, created_at, accepted_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(20),
      database
        .from("team_notification_settings")
        .select("slack_webhook_url, email_digest_enabled")
        .eq("workspace_id", workspace.id)
        .maybeSingle(),
      database
        .from("team_notifications")
        .select("id, kind, body, conversation_id, read_at, created_at")
        .eq("workspace_id", workspace.id)
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      readPermissionRules(supabase, workspace.id),
    ]);

  const invites = ((invitesRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    email: String(row.email),
    role: (row.role as MemberRole) ?? "member",
    expiresAt: String(row.expires_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    acceptedAt: (row.accepted_at as string | null) ?? null,
  }));
  const notificationRow = (notificationsRes.data ?? null) as Record<string, unknown> | null;
  const notificationsForMe = ((notificationsForMeRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      id: String(row.id),
      kind: String(row.kind) as TeamNotification["kind"],
      body: String(row.body),
      conversationId: (row.conversation_id as string | null) ?? null,
      readAt: (row.read_at as string | null) ?? null,
      createdAt: String(row.created_at),
    })
  );

  return {
    activeWorkspaceId: workspace.id,
    currentRole: workspace.role,
    workspaces,
    members,
    invites,
    notifications: {
      slackWebhookUrl: (notificationRow?.slack_webhook_url as string | null) ?? null,
      emailDigestEnabled: Boolean(notificationRow?.email_digest_enabled ?? false),
    },
    notificationsForMe,
    permissionRules,
    permissions: permissionsFor(workspace.role, permissionRules),
  };
}

export async function createWorkspace(input: {
  name: string;
}): Promise<{ ok: boolean; workspaceId: string | null; error: string | null }> {
  const name = normalizeWorkspaceName(input.name);
  if (!name) return { ok: false, workspaceId: null, error: "Nom de workspace requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, workspaceId: null, error: "unauthenticated" };

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();
  if (error || !data) return { ok: false, workspaceId: null, error: error?.message ?? "fail" };

  await supabase.from("profiles").update({ active_workspace_id: data.id }).eq("id", user.id);
  await logConversationActivity({
    workspaceId: data.id as string,
    conversationId: null,
    actorId: user.id,
    eventType: "workspace_created",
    body: null,
    metadata: {},
  });
  revalidatePath("/app", "layout");
  return { ok: true, workspaceId: data.id as string, error: null };
}

export async function switchWorkspace(input: {
  workspaceId: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { ok: false, error: "Vous n'avez pas accès à ce workspace." };

  await supabase
    .from("profiles")
    .update({ active_workspace_id: input.workspaceId })
    .eq("id", user.id);
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function inviteTeammate(input: {
  email: string;
  role: MemberRole;
}): Promise<{
  ok: boolean;
  inviteLink: string | null;
  emailSent: boolean;
  error: string | null;
}> {
  const email = normalizeInviteEmail(input.email);
  if (!email) return { ok: false, inviteLink: null, emailSent: false, error: "Email invalide." };
  const role: MemberRole = input.role === "admin" ? "admin" : "member";

  const { supabase, user, workspace } = await requireActiveWorkspace();
  if (!user || !workspace)
    return { ok: false, inviteLink: null, emailSent: false, error: "no workspace" };
  const permissionRules = await readPermissionRules(supabase, workspace.id);
  if (!roleAllowed(workspace.role, permissionRules.inviteRoles)) {
    return { ok: false, inviteLink: null, emailSent: false, error: "Permission insuffisante." };
  }

  const token = randomBytes(32).toString("base64url");
  const inviteLink = `${appUrl()}/invite/${token}`;
  await supabase
    .from("workspace_invites")
    .delete()
    .eq("workspace_id", workspace.id)
    .ilike("email", email)
    .is("accepted_at", null)
    .lt("expires_at", new Date().toISOString());
  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspace.id,
    email,
    role,
    token_hash: hashToken(token),
    invited_by: user.id,
  });
  if (error) return { ok: false, inviteLink: null, emailSent: false, error: error.message };

  await logConversationActivity({
    workspaceId: workspace.id,
    conversationId: null,
    actorId: user.id,
    eventType: "teammate_invited",
    body: null,
    metadata: { email, role },
  });
  const emailSent = await sendInviteEmail({ to: email, workspaceName: workspace.name, inviteLink });
  await notifySlack(supabase, workspace.id, `Freescale · ${email} invité dans ${workspace.name}.`);
  revalidatePath("/app/settings/team");
  return { ok: true, inviteLink, emailSent, error: null };
}

export async function acceptWorkspaceInvite(
  token: string
): Promise<{ ok: boolean; workspaceId: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, workspaceId: null, error: "unauthenticated" };

  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, email, role, accepted_at, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !invite) return { ok: false, workspaceId: null, error: "Invitation introuvable." };

  const row = invite as Record<string, unknown>;
  if (row.accepted_at) return { ok: false, workspaceId: null, error: "Invitation déjà utilisée." };
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { ok: false, workspaceId: null, error: "Invitation expirée." };
  }
  const inviteEmail = normalizeInviteEmail(String(row.email));
  if (inviteEmail !== normalizeInviteEmail(user.email)) {
    return { ok: false, workspaceId: null, error: "Cette invitation est liée à un autre email." };
  }

  const workspaceId = String(row.workspace_id);
  const role = (row.role as MemberRole) ?? "member";
  await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: user.id, role })
    .throwOnError();
  await supabase
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", row.id)
    .throwOnError();
  await supabase.from("profiles").update({ active_workspace_id: workspaceId }).eq("id", user.id);
  await logConversationActivity({
    workspaceId,
    conversationId: null,
    actorId: user.id,
    eventType: "teammate_joined",
    body: null,
    metadata: { email: user.email, role },
  });
  revalidatePath("/app", "layout");
  return { ok: true, workspaceId, error: null };
}

export async function updateMemberRole(input: {
  userId: string;
  role: MemberRole;
}): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, workspace } = await requireActiveWorkspace();
  if (!workspace) return { ok: false, error: "no workspace" };
  if (!canManageWorkspace(workspace.role))
    return { ok: false, error: "Seul l'owner peut modifier les rôles." };
  if (input.role === "owner")
    return { ok: false, error: "Le transfert owner n'est pas disponible ici." };

  const { error } = await supabase
    .from("workspace_members")
    .update({ role: input.role })
    .eq("workspace_id", workspace.id)
    .eq("user_id", input.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/team");
  return { ok: true, error: null };
}

export async function removeTeamMember(input: {
  userId: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, workspace } = await requireActiveWorkspace();
  if (!workspace) return { ok: false, error: "no workspace" };
  if (!canManageWorkspace(workspace.role))
    return { ok: false, error: "Seul l'owner peut retirer un membre." };

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("user_id", input.userId)
    .neq("role", "owner");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/team");
  return { ok: true, error: null };
}

export async function updateTeamNotifications(input: {
  slackWebhookUrl?: string | null;
  emailDigestEnabled: boolean;
}): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, user, workspace } = await requireActiveWorkspace();
  if (!user || !workspace) return { ok: false, error: "no workspace" };
  if (!canManageWorkspace(workspace.role) && !canInviteTeammates(workspace.role)) {
    return { ok: false, error: "Permission insuffisante." };
  }
  const slackWebhookUrl = input.slackWebhookUrl?.trim() || null;
  if (slackWebhookUrl && !/^https:\/\/hooks\.slack\.com\/services\//.test(slackWebhookUrl)) {
    return { ok: false, error: "Webhook Slack invalide." };
  }

  const { error } = await supabase.from("team_notification_settings").upsert(
    {
      workspace_id: workspace.id,
      slack_webhook_url: slackWebhookUrl,
      email_digest_enabled: input.emailDigestEnabled,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/team");
  return { ok: true, error: null };
}

export async function markTeamNotificationRead(
  notificationId: string
): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, user, workspace } = await requireActiveWorkspace();
  if (!user || !workspace) return { ok: false, error: "no workspace" };

  const { error } = await supabase
    .from("team_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("workspace_id", workspace.id)
    .eq("recipient_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/team");
  return { ok: true, error: null };
}

export async function updateWorkspacePermissions(input: {
  inviteRoles: MemberRole[];
  connectChannelRoles: MemberRole[];
  assignRoles: MemberRole[];
}): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, user, workspace } = await requireActiveWorkspace();
  if (!user || !workspace) return { ok: false, error: "no workspace" };
  if (!canManageWorkspace(workspace.role)) {
    return { ok: false, error: "Seul l'owner peut modifier les permissions." };
  }
  const normalize = (roles: MemberRole[]) =>
    Array.from(new Set(["owner", ...roles.filter((role) => role !== "owner")])) as MemberRole[];
  const { error } = await supabase.from("workspace_permission_settings").upsert(
    {
      workspace_id: workspace.id,
      invite_roles: normalize(input.inviteRoles),
      connect_channel_roles: normalize(input.connectChannelRoles),
      assign_roles: normalize(input.assignRoles),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function currentUserCanConnectChannels(): Promise<boolean> {
  const { supabase, workspace } = await requireActiveWorkspace();
  if (!workspace) return false;
  const rules = await readPermissionRules(supabase, workspace.id);
  return roleAllowed(workspace.role, rules.connectChannelRoles);
}

export async function logConversationActivity(input: {
  workspaceId: string;
  conversationId: string | null;
  actorId: string | null;
  eventType: string;
  body: string | null;
  metadata: Record<string, unknown>;
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("conversation_activity_events").insert({
    workspace_id: input.workspaceId,
    conversation_id: input.conversationId,
    actor_id: input.actorId,
    event_type: input.eventType,
    body: input.body,
    metadata: input.metadata,
  });
  return { ok: !error, error: error?.message ?? null };
}

export async function assignConversation(input: {
  conversationId: string;
  assigneeId: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, user, workspace } = await requireActiveWorkspace();
  if (!user || !workspace) return { ok: false, error: "no workspace" };
  const permissionRules = await readPermissionRules(supabase, workspace.id);
  if (!roleAllowed(workspace.role, permissionRules.assignRoles)) {
    return { ok: false, error: "Permission insuffisante." };
  }

  if (input.assigneeId) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", input.assigneeId)
      .maybeSingle();
    if (!member) return { ok: false, error: "Ce teammate n'appartient pas au workspace." };
  }

  const { data: assigneeProfile } = input.assigneeId
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", input.assigneeId)
        .maybeSingle()
    : { data: null };

  const { error } = await supabase
    .from("conversations")
    .update({ assigned_to: input.assigneeId })
    .eq("id", input.conversationId)
    .eq("workspace_id", workspace.id);
  if (error) return { ok: false, error: error.message };

  await logConversationActivity({
    workspaceId: workspace.id,
    conversationId: input.conversationId,
    actorId: user.id,
    eventType: input.assigneeId ? "assigned" : "unassigned",
    body: null,
    metadata: {
      assigneeId: input.assigneeId,
      assigneeName:
        (assigneeProfile?.full_name as string | null) ??
        (assigneeProfile?.email as string | null) ??
        null,
    },
  });
  if (input.assigneeId && input.assigneeId !== user.id) {
    await supabase.from("team_notifications").insert({
      workspace_id: workspace.id,
      recipient_id: input.assigneeId,
      actor_id: user.id,
      conversation_id: input.conversationId,
      kind: "assignment",
      body: `${user.email ?? "Un teammate"} vous a assigné une conversation dans ${workspace.name}.`,
    });
  }
  await notifySlack(
    supabase,
    workspace.id,
    input.assigneeId
      ? `Freescale · Conversation assignée à ${
          (assigneeProfile?.full_name as string | null) ??
          (assigneeProfile?.email as string | null) ??
          "un teammate"
        }.`
      : "Freescale · Assignation retirée d'une conversation."
  );
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function listConversationCollaboration(
  conversationId: string
): Promise<ConversationCollaboration> {
  const { supabase, workspace } = await requireActiveWorkspace();
  if (!workspace) {
    return {
      assignedTo: null,
      members: [],
      notes: [],
      activity: [],
      permissions: {
        canManageWorkspace: false,
        canInvite: false,
        canConnectChannels: false,
        canAssignConversation: false,
      },
      error: "no workspace",
    };
  }

  const database = supabase;
  const [members, conversationRes, notesRes, activityRes, permissionRules] = await Promise.all([
    listMembers(supabase, workspace.id),
    supabase
      .from("conversations")
      .select("assigned_to")
      .eq("id", conversationId)
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    database
      .from("conversation_internal_notes")
      .select("id, body, mention_handles, created_at, profiles(email, full_name)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(30),
    database
      .from("conversation_activity_events")
      .select("id, event_type, body, metadata, created_at, profiles(email, full_name)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(40),
    readPermissionRules(supabase, workspace.id),
  ]);

  const notes = ((notesRes.data ?? []) as Record<string, unknown>[]).map((row) => {
    const profile = rowProfile(row);
    return {
      id: String(row.id),
      authorName: String(profile.full_name ?? profile.email ?? "Teammate"),
      authorEmail: String(profile.email ?? ""),
      body: String(row.body ?? ""),
      mentionHandles: Array.isArray(row.mention_handles) ? (row.mention_handles as string[]) : [],
      createdAt: String(row.created_at ?? ""),
    };
  });
  const activity = ((activityRes.data ?? []) as Record<string, unknown>[]).map((row) => {
    const profile = rowProfile(row);
    return {
      id: String(row.id),
      actorName: String(profile.full_name ?? profile.email ?? "Freescale"),
      actorEmail: (profile.email as string | null) ?? null,
      eventType: String(row.event_type ?? "updated"),
      body: (row.body as string | null) ?? null,
      metadata: ((row.metadata ?? {}) as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at ?? ""),
    };
  });

  return {
    assignedTo: (conversationRes.data?.assigned_to as string | null) ?? null,
    members,
    notes,
    activity,
    permissions: permissionsFor(workspace.role, permissionRules),
    error: null,
  };
}

export async function createInternalNote(input: {
  conversationId: string;
  body: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Note vide." };

  const { supabase, user, workspace } = await requireActiveWorkspace();
  if (!user || !workspace) return { ok: false, error: "no workspace" };
  const members = await listMembers(supabase, workspace.id);
  const mentionHandles = extractMentionHandles(body);
  const mentionedUserIds = members
    .filter((member) => {
      const names = [member.email.split("@")[0], member.fullName, member.fullName?.split(/\s+/)[0]]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return mentionHandles.some((handle) => names.includes(handle));
    })
    .map((member) => member.userId);

  const { error } = await supabase.from("conversation_internal_notes").insert({
    workspace_id: workspace.id,
    conversation_id: input.conversationId,
    author_id: user.id,
    body: body.slice(0, 4000),
    mention_handles: mentionHandles,
    mentioned_user_ids: mentionedUserIds,
  });
  if (error) return { ok: false, error: error.message };

  const notificationRecipients = mentionedUserIds.filter((memberId) => memberId !== user.id);
  if (notificationRecipients.length > 0) {
    await supabase.from("team_notifications").insert(
      notificationRecipients.map((recipientId) => ({
        workspace_id: workspace.id,
        recipient_id: recipientId,
        actor_id: user.id,
        conversation_id: input.conversationId,
        kind: "mention",
        body: `${user.email ?? "Un teammate"} vous a mentionné : ${body.slice(0, 180)}`,
      }))
    );
  }

  await logConversationActivity({
    workspaceId: workspace.id,
    conversationId: input.conversationId,
    actorId: user.id,
    eventType: "note_created",
    body: body.slice(0, 280),
    metadata: { mentionHandles, mentionedUserIds },
  });
  await notifySlack(
    supabase,
    workspace.id,
    `Freescale · Nouvelle note interne${mentionHandles.length ? ` mentionnant @${mentionHandles.join(", @")}` : ""}.`
  );
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}
