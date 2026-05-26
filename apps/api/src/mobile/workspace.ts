import type {
  MobileMeResponse,
  MobileMemberRole,
  MobileProfile,
  MobileWorkspace,
} from "@freescale/types";
import type { MobileAuthenticatedUser } from "./auth";
import type { UserSupabaseClient } from "./supabase";

type ProfileRow = {
  id?: unknown;
  email?: unknown;
  full_name?: unknown;
  avatar_url?: unknown;
  active_workspace_id?: unknown;
};

type MembershipRow = {
  role?: unknown;
  workspaces?: unknown;
};

export class MobileRouteError extends Error {
  constructor(
    readonly code: string,
    readonly status: 404 | 502,
    message: string
  ) {
    super(message);
  }
}

function memberRole(value: unknown): MobileMemberRole {
  return value === "owner" || value === "admin" ? value : "member";
}

function embeddedWorkspace(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function requireRows<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    throw new MobileRouteError("upstream_error", 502, "Impossible de charger les données.");
  }
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as T[]) : [];
}

function toProfile(row: ProfileRow | undefined, user: MobileAuthenticatedUser): MobileProfile {
  return {
    id: typeof row?.id === "string" ? row.id : user.id,
    email: typeof row?.email === "string" ? row.email : (user.email ?? ""),
    fullName: typeof row?.full_name === "string" ? row.full_name : null,
    avatarUrl: typeof row?.avatar_url === "string" ? row.avatar_url : null,
  };
}

function toWorkspace(row: MembershipRow): MobileWorkspace | null {
  const workspace = embeddedWorkspace(row.workspaces);
  if (!workspace || typeof workspace.id !== "string") return null;
  return {
    id: workspace.id,
    name: typeof workspace.name === "string" ? workspace.name : "Workspace",
    role: memberRole(row.role),
  };
}

export async function resolveMobileWorkspaceContext(
  client: UserSupabaseClient,
  user: MobileAuthenticatedUser
): Promise<MobileMeResponse> {
  const profileResponse = await client.request(
    `/rest/v1/profiles?select=id,email,full_name,avatar_url,active_workspace_id&id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  const memberResponse = await client.request(
    `/rest/v1/workspace_members?select=role,workspaces(id,name)&user_id=eq.${encodeURIComponent(user.id)}&order=added_at.asc`
  );
  const profileRows = await requireRows<ProfileRow>(profileResponse);
  const memberRows = await requireRows<MembershipRow>(memberResponse);
  const workspaces = memberRows
    .map(toWorkspace)
    .filter((workspace): workspace is MobileWorkspace => workspace !== null);

  if (workspaces.length === 0) {
    throw new MobileRouteError("workspace_not_found", 404, "Aucun espace accessible.");
  }

  const profileRow = profileRows[0];
  const savedWorkspaceId =
    typeof profileRow?.active_workspace_id === "string" ? profileRow.active_workspace_id : null;
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === savedWorkspaceId) ?? workspaces[0];

  if (!activeWorkspace) {
    throw new MobileRouteError("workspace_not_found", 404, "Aucun espace accessible.");
  }

  return {
    profile: toProfile(profileRow, user),
    activeWorkspace,
    workspaces,
  };
}
