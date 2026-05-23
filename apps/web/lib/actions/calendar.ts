"use server";

import { createClient } from "@/lib/supabase/server";
import type { CalEvent } from "@/lib/types";
import { revalidatePath } from "next/cache";

/**
 * Convert the week-grid coords (day 0-6 + minutes-from-8AM + duration)
 * into ISO timestamps anchored on this calendar week's Sunday. The
 * caller passes the user's local week-start date (Sunday at 00:00)
 * so we don't drift across timezones — the React side computes it
 * from the BROWSER's "now", same way the existing inbox grouping does.
 */
function gridToTimestamps(
  weekStartIso: string,
  day: number,
  startMinutes: number,
  durationMinutes: number
): { starts_at: string; ends_at: string } {
  const weekStart = new Date(weekStartIso);
  // weekStart is Sunday 00:00 local time. Offset to the target day +
  // 8 AM (the grid origin) + the within-day minute offset.
  const start = new Date(weekStart);
  start.setDate(weekStart.getDate() + day);
  start.setHours(8, 0, 0, 0);
  start.setMinutes(start.getMinutes() + startMinutes);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}

async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function createCalendarEvent(input: {
  title: string;
  day: number;
  startMinutes: number;
  durationMinutes: number;
  weekStartIso: string;
  color?: CalEvent["color"];
}): Promise<{ ok: boolean; id: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, id: null, error: "unauthenticated" };

  const title = input.title.trim();
  if (!title) return { ok: false, id: null, error: "Le titre est requis." };

  const workspaceId = await resolveWorkspaceId(supabase, user.id);
  if (!workspaceId) return { ok: false, id: null, error: "Pas de workspace." };

  const { starts_at, ends_at } = gridToTimestamps(
    input.weekStartIso,
    input.day,
    input.startMinutes,
    input.durationMinutes
  );

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      workspace_id: workspaceId,
      title,
      starts_at,
      ends_at,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { ok: false, id: null, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, id: data.id as string, error: null };
}

export async function updateCalendarEvent(input: {
  id: string;
  title?: string;
  day?: number;
  startMinutes?: number;
  durationMinutes?: number;
  weekStartIso?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const t = input.title.trim();
    if (!t) return { ok: false, error: "Le titre est requis." };
    patch.title = t;
  }

  // If ANY of (day / startMinutes / durationMinutes) is provided, we
  // need ALL of them to rebuild the timestamps — recompute from the
  // current row's values for what wasn't provided.
  const needsTimestampRebuild =
    input.day !== undefined ||
    input.startMinutes !== undefined ||
    input.durationMinutes !== undefined;

  if (needsTimestampRebuild) {
    if (!input.weekStartIso) {
      return { ok: false, error: "weekStartIso required when moving event" };
    }
    // Fetch current row so we can fill the gaps.
    const { data: current, error: fetchErr } = await supabase
      .from("calendar_events")
      .select("starts_at, ends_at")
      .eq("id", input.id)
      .maybeSingle();
    if (fetchErr || !current) {
      return { ok: false, error: fetchErr?.message ?? "Event introuvable" };
    }
    const start = new Date(current.starts_at as string);
    const end = new Date(current.ends_at as string);
    const weekStart = new Date(input.weekStartIso);
    const minutesFrom8 = (start.getHours() - 8) * 60 + start.getMinutes();
    const dayFromStart = Math.floor((start.getTime() - weekStart.getTime()) / 86400000);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);

    const day = input.day ?? dayFromStart;
    const startMin = input.startMinutes ?? minutesFrom8;
    const dur = input.durationMinutes ?? duration;

    const { starts_at, ends_at } = gridToTimestamps(input.weekStartIso, day, startMin, dur);
    patch.starts_at = starts_at;
    patch.ends_at = ends_at;
  }

  const { error } = await supabase.from("calendar_events").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}

export async function deleteCalendarEvent(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, error: null };
}
