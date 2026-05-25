import { getCronAuthorizationStatus } from "@/lib/cron-auth";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DigestProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "daily_digest_last_sent_at" | "email" | "full_name" | "id"
>;

type DigestConversation = {
  id: string;
  subject: string | null;
  preview: string | null;
  last_message_at: string;
  contacts?: { display_name?: string | null; email?: string | null } | null;
};

type TeamDigestNotification = Pick<
  Database["public"]["Tables"]["team_notifications"]["Row"],
  "body" | "created_at" | "id" | "kind" | "recipient_id"
>;

function startOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function alreadySentToday(profile: DigestProfile, now = new Date()): boolean {
  if (!profile.daily_digest_last_sent_at) return false;
  return new Date(profile.daily_digest_last_sent_at).getTime() >= startOfToday(now).getTime();
}

function digestHtml(profile: DigestProfile, conversations: DigestConversation[]): string {
  const name = profile.full_name?.split(/\s+/)[0] || "there";
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "https://freescale.site";
  const items = conversations
    .slice(0, 5)
    .map((conversation) => {
      const contact = conversation.contacts;
      const from = contact?.display_name || contact?.email || "Conversation";
      const subject = conversation.subject || "Sans sujet";
      const preview = (conversation.preview || "").replace(/\s+/g, " ").trim();
      return `<li style="margin:0 0 14px">
        <strong>${escapeHtml(from)}</strong>
        <div style="color:#0f172a">${escapeHtml(subject)}</div>
        <div style="color:#64748b;font-size:13px">${escapeHtml(preview)}</div>
      </li>`;
    })
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#0f172a">
      <h1 style="font-size:24px;line-height:1.2">Votre brief Mue du jour</h1>
      <p>Bonjour ${escapeHtml(name)},</p>
      ${
        conversations.length > 0
          ? `<p>Voici les conversations qui méritent votre attention ce matin.</p><ol style="padding-left:20px">${items}</ol>`
          : `<p>Inbox calme ce matin. Rien d'urgent détecté.</p>`
      }
      <p><a href="${app}/app" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Ouvrir Freescale</a></p>
      <p style="color:#64748b;font-size:13px">Vous pouvez désactiver ce digest dans Paramètres → Profil.</p>
    </div>
  `;
}

function teamDigestHtml(profile: DigestProfile, notifications: TeamDigestNotification[]): string {
  const name = profile.full_name?.split(/\s+/)[0] || "there";
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "https://freescale.site";
  const items = notifications
    .map(
      (notification) => `<li style="margin:0 0 12px">
        <strong>${notification.kind === "mention" ? "Mention" : "Assignation"}</strong>
        <div style="color:#334155">${escapeHtml(notification.body)}</div>
      </li>`
    )
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#0f172a">
      <h1 style="font-size:24px;line-height:1.2">Activité de votre équipe</h1>
      <p>Bonjour ${escapeHtml(name)},</p>
      <p>Voici vos notifications Freescale non lues.</p>
      <ol style="padding-left:20px">${items}</ol>
      <p><a href="${app}/app/settings/team" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Voir l'activité équipe</a></p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendDigest(
  profile: DigestProfile,
  conversations: DigestConversation[]
): Promise<{ ok: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY missing" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Freescale <hello@freescale.app>",
      html: digestHtml(profile, conversations),
      subject: "Votre brief Mue du jour",
      to: [profile.email],
    }),
  });

  if (!response.ok) {
    return { ok: false, error: (await response.text()) || `Resend ${response.status}` };
  }

  return { ok: true, error: null };
}

async function sendTeamDigest(
  profile: DigestProfile,
  notifications: TeamDigestNotification[]
): Promise<{ ok: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY missing" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Freescale <hello@freescale.app>",
      html: teamDigestHtml(profile, notifications),
      subject: "Votre activité équipe Freescale",
      to: [profile.email],
    }),
  });

  if (!response.ok) {
    return { ok: false, error: (await response.text()) || `Resend ${response.status}` };
  }
  return { ok: true, error: null };
}

export async function GET(request: NextRequest) {
  const authorization = getCronAuthorizationStatus(
    process.env.CRON_SECRET,
    request.headers.get("authorization")
  );
  if (authorization === "misconfigured") {
    return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  }
  if (authorization === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: 0, skipped: "RESEND_API_KEY missing" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase service env missing" }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, daily_digest_last_sent_at")
    .eq("daily_digest_enabled", true)
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let teamSent = 0;
  const failures: Array<{ email: string; error: string }> = [];
  const checked = profiles?.length ?? 0;

  for (const profile of (profiles ?? []) as DigestProfile[]) {
    if (alreadySentToday(profile)) continue;

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: conversations } = workspace?.id
      ? await supabase
          .from("conversations")
          .select("id, subject, preview, last_message_at, contacts(display_name, email)")
          .eq("workspace_id", workspace.id)
          .eq("archived", false)
          .order("last_message_at", { ascending: false })
          .limit(8)
      : { data: [] };

    const result = await sendDigest(profile, (conversations ?? []) as DigestConversation[]);
    if (!result.ok) {
      failures.push({ email: profile.email, error: result.error ?? "unknown" });
      continue;
    }

    await supabase
      .from("profiles")
      .update({ daily_digest_last_sent_at: new Date().toISOString() })
      .eq("id", profile.id);
    sent += 1;
  }

  const { data: teamSettings, error: teamSettingsError } = await supabase
    .from("team_notification_settings")
    .select("workspace_id")
    .eq("email_digest_enabled", true)
    .limit(100);
  if (teamSettingsError) {
    return NextResponse.json({ error: teamSettingsError.message, failures, sent }, { status: 500 });
  }

  for (const setting of teamSettings ?? []) {
    const { data: notices, error: noticesError } = await supabase
      .from("team_notifications")
      .select("id, recipient_id, kind, body, created_at")
      .eq("workspace_id", setting.workspace_id)
      .is("read_at", null)
      .is("digest_sent_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (noticesError) {
      failures.push({ email: "team-digest", error: noticesError.message });
      continue;
    }

    const byRecipient = new Map<string, TeamDigestNotification[]>();
    for (const notice of notices ?? []) {
      const current = byRecipient.get(notice.recipient_id) ?? [];
      current.push(notice);
      byRecipient.set(notice.recipient_id, current);
    }

    for (const [recipientId, recipientNotices] of byRecipient) {
      const { data: recipient } = await supabase
        .from("profiles")
        .select("id, email, full_name, daily_digest_last_sent_at")
        .eq("id", recipientId)
        .maybeSingle();
      if (!recipient) continue;

      const result = await sendTeamDigest(recipient, recipientNotices);
      if (!result.ok) {
        failures.push({ email: recipient.email, error: result.error ?? "unknown" });
        continue;
      }
      await supabase
        .from("team_notifications")
        .update({ digest_sent_at: new Date().toISOString() })
        .in(
          "id",
          recipientNotices.map((notice) => notice.id)
        );
      teamSent += 1;
    }
  }

  return NextResponse.json({ checked, failures, sent, teamSent });
}
