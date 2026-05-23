"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type EmailTemplate = {
  id: string;
  name: string;
  body: string;
  visibility: "personal" | "team";
  updatedAt: string;
};

/**
 * Find the user's primary workspace id (oldest one they own). Templates
 * are scoped to a workspace so teammates share them; we keep selection
 * implicit until we add a workspace switcher.
 */
async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  return getActiveWorkspaceId(supabase, userId);
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceId = await resolveWorkspaceId(supabase, user.id);
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("email_templates")
    .select("id, name, body, visibility, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "",
    body: (row.body as string) ?? "",
    visibility: row.visibility === "personal" ? "personal" : "team",
    updatedAt: (row.updated_at as string) ?? "",
  }));
}

export async function createEmailTemplate(input: {
  name: string;
  body: string;
  visibility?: "personal" | "team";
}): Promise<{ ok: boolean; template: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, template: null, error: "unauthenticated" };

  const name = input.name.trim();
  if (!name) return { ok: false, template: null, error: "Le nom est requis." };
  if (name.length > 80) return { ok: false, template: null, error: "Nom trop long (80 max)." };

  const workspaceId = await resolveWorkspaceId(supabase, user.id);
  if (!workspaceId) return { ok: false, template: null, error: "Pas de workspace." };

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      name,
      body: input.body ?? "",
      visibility: input.visibility === "personal" ? "personal" : "team",
    })
    .select("id, name, body, visibility, updated_at")
    .single();

  if (error || !data) return { ok: false, template: null, error: error?.message ?? "fail" };
  revalidatePath("/app", "layout");
  return {
    ok: true,
    template: {
      id: data.id as string,
      name: data.name as string,
      body: (data.body as string) ?? "",
      visibility: data.visibility === "personal" ? "personal" : "team",
      updatedAt: (data.updated_at as string) ?? "",
    },
    error: null,
  };
}

export async function updateEmailTemplate(input: {
  id: string;
  name: string;
  body: string;
  visibility?: "personal" | "team";
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom est requis." };
  if (name.length > 80) return { ok: false, error: "Nom trop long (80 max)." };

  const { error } = await supabase
    .from("email_templates")
    .update({
      name,
      body: input.body ?? "",
      visibility: input.visibility === "personal" ? "personal" : "team",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function deleteEmailTemplate(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}
