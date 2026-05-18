"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  conversationId: string;
  name: string;
  contactEmail: string | null;
  subject: string | null;
  preview: string;
  /** Where the match was found — drives the "matched in body" hint. */
  matchedIn: "subject" | "preview" | "contact" | "body";
  lastMessageAt: string;
};

/**
 * Global inbox search — covers the user's full workspace, not just
 * the 150 conversations the inbox page eagerly loads. Three ILIKE
 * scans run in parallel:
 *
 *   1. conversations: subject ILIKE %q% OR preview ILIKE %q%
 *   2. contacts:      display_name ILIKE %q% OR email ILIKE %q%
 *      (then walk back to the conversations they appear on)
 *   3. messages:      body_text ILIKE %q%
 *      (then walk back to the parent conversation)
 *
 * Results are merged, deduplicated by conversation_id, sorted by
 * recency, and capped at `limit`. For workspaces under a few thousand
 * messages this is well under 200ms; past that we'd want a tsvector
 * full-text index (future work, not blocking).
 */
export async function searchInbox(
  query: string,
  limit = 12
): Promise<{ results: SearchHit[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: [], error: "unauthenticated" };

  const q = query.trim();
  if (q.length < 2) return { results: [], error: null };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!workspace?.id) return { results: [], error: "no workspace" };

  // Postgres ILIKE pattern — escape % and _ in user input so they're
  // treated as literals. Wrap in % for substring match.
  const safe = q.replace(/[%_]/g, "\\$&");
  const pattern = `%${safe}%`;

  // Run three searches in parallel.
  const [bySubjectPreview, byContact, byBody] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, subject, preview, last_message_at, contacts(display_name, email)"
      )
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .or(`subject.ilike.${pattern},preview.ilike.${pattern}`)
      .order("last_message_at", { ascending: false })
      .limit(limit),
    supabase
      .from("conversations")
      .select(
        "id, subject, preview, last_message_at, contacts!inner(display_name, email)"
      )
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .or(`display_name.ilike.${pattern},email.ilike.${pattern}`, {
        referencedTable: "contacts",
      })
      .order("last_message_at", { ascending: false })
      .limit(limit),
    supabase
      .from("messages")
      .select(
        "conversation_id, conversations!inner(id, subject, preview, last_message_at, contacts(display_name, email))"
      )
      .eq("workspace_id", workspace.id)
      .ilike("body_text", pattern)
      .order("sent_at", { ascending: false })
      .limit(limit * 2),
  ]);

  const byConvId = new Map<string, SearchHit>();
  const collect = (
    rows: unknown[] | null | undefined,
    matchedIn: SearchHit["matchedIn"]
  ) => {
    for (const row of (rows ?? []) as Record<string, unknown>[]) {
      const conv =
        matchedIn === "body"
          ? ((row.conversations as Record<string, unknown>) ?? null)
          : row;
      if (!conv) continue;
      const id = conv.id as string;
      if (!id || byConvId.has(id)) continue;
      const contact = (conv.contacts ?? null) as Record<string, unknown> | null;
      const c = Array.isArray(contact) ? contact[0] : contact;
      byConvId.set(id, {
        conversationId: id,
        name: ((c?.display_name as string) || (c?.email as string) || "Sans nom"),
        contactEmail: ((c?.email as string) ?? null),
        subject: (conv.subject as string) ?? null,
        preview: (conv.preview as string) ?? "",
        matchedIn,
        lastMessageAt:
          (conv.last_message_at as string) ?? new Date().toISOString(),
      });
    }
  };
  collect(bySubjectPreview.data ?? [], "subject");
  collect(byContact.data ?? [], "contact");
  collect(byBody.data ?? [], "body");

  const results = Array.from(byConvId.values())
    .sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )
    .slice(0, limit);

  return { results, error: null };
}
