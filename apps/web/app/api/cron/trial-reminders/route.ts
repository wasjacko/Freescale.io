import { getCronAuthorizationStatus } from "@/lib/cron-auth";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TrialProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "email" | "full_name" | "id" | "trial_ends_at"
>;

function getTargetWindow(now = new Date()): { start: string; end: string } {
  const start = new Date(now.getTime() + 3 * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function reminderHtml(profile: TrialProfile): string {
  const name = profile.full_name?.split(/\s+/)[0] || "there";
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "https://freescale.site";
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#0f172a">
      <h1 style="font-size:24px;line-height:1.2">Votre essai Freescale se termine dans 3 jours.</h1>
      <p>Bonjour ${name},</p>
      <p>Mue reste disponible dans votre inbox pendant encore 3 jours. Passez à Pro pour garder les actions IA sans interruption.</p>
      <p><a href="${app}/app/settings/billing" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Voir l'abonnement</a></p>
      <p style="color:#64748b;font-size:13px">Si vous êtes encore en train de tester, aucune action n'est requise.</p>
    </div>
  `;
}

async function sendReminder(profile: TrialProfile): Promise<{ ok: boolean; error: string | null }> {
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
      html: reminderHtml(profile),
      subject: "Votre essai Freescale se termine dans 3 jours",
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
  const window = getTargetWindow();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, trial_ends_at")
    .eq("plan", "free")
    .is("trial_reminder_sent_at", null)
    .gte("trial_ends_at", window.start)
    .lt("trial_ends_at", window.end)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const failures: Array<{ email: string; error: string }> = [];
  for (const profile of (profiles ?? []) as TrialProfile[]) {
    const result = await sendReminder(profile);
    if (!result.ok) {
      failures.push({ email: profile.email, error: result.error ?? "unknown" });
      continue;
    }

    await supabase
      .from("profiles")
      .update({ trial_reminder_sent_at: new Date().toISOString() })
      .eq("id", profile.id);
    sent += 1;
  }

  return NextResponse.json({ checked: profiles?.length ?? 0, failures, sent });
}
