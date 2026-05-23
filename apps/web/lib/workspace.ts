import "server-only";

import type { MemberRole } from "@/lib/collaboration";
import type { createClient } from "@/lib/supabase/server";

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type WorkspaceSummary = {
  id: string;
  name: string;
  ownerId: string;
  role: MemberRole;
  createdAt: string;
};

function asWorkspace(row: Record<string, unknown>): WorkspaceSummary | null {
  const workspace = row.workspaces as Record<string, unknown> | null;
  if (!workspace?.id) return null;
  return {
    id: String(workspace.id),
    name: String(workspace.name ?? "Workspace"),
    ownerId: String(workspace.owner_id ?? ""),
    role: (row.role as MemberRole) ?? "member",
    createdAt: String(workspace.created_at ?? row.added_at ?? new Date().toISOString()),
  };
}

export async function listUserWorkspaces(
  supabase: SupabaseServer,
  userId: string
): Promise<WorkspaceSummary[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, added_at, workspaces(id, name, owner_id, created_at)")
    .eq("user_id", userId)
    .order("added_at", { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[])
    .map(asWorkspace)
    .filter((workspace): workspace is WorkspaceSummary => workspace !== null)
    .sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (a.role !== "owner" && b.role === "owner") return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

export async function resolveActiveWorkspace(
  supabase: SupabaseServer,
  userId: string
): Promise<{ workspace: WorkspaceSummary | null; workspaces: WorkspaceSummary[] }> {
  const [workspaces, profileRes] = await Promise.all([
    listUserWorkspaces(supabase, userId),
    supabase.from("profiles").select("active_workspace_id").eq("id", userId).maybeSingle(),
  ]);

  if (workspaces.length === 0) return { workspace: null, workspaces };
  const activeId = (profileRes.data as Record<string, unknown> | null)?.active_workspace_id as
    | string
    | null
    | undefined;
  const active = workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0] ?? null;

  if (active && active.id !== activeId) {
    await supabase.from("profiles").update({ active_workspace_id: active.id }).eq("id", userId);
  }

  return { workspace: active, workspaces };
}

export async function getActiveWorkspaceId(
  supabase: SupabaseServer,
  userId: string
): Promise<string | null> {
  const { workspace } = await resolveActiveWorkspace(supabase, userId);
  return workspace?.id ?? null;
}

export async function getActiveWorkspaceRole(
  supabase: SupabaseServer,
  userId: string
): Promise<MemberRole | null> {
  const { workspace } = await resolveActiveWorkspace(supabase, userId);
  return workspace?.role ?? null;
}
