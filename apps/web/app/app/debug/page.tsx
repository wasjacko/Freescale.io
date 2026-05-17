import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, type GmailMessage } from "@/lib/gmail";

/**
 * Diagnostic page — surfaces the raw label set Gmail puts on each recent
 * Inbox message so we can see why a given mail does or doesn't end up in
 * Freescale's Principale view. Hit /app/debug after authenticating.
 *
 * Runs FOUR Gmail queries side-by-side so we can compare what each filter
 * actually returns vs what the user sees in Gmail. The query that matches
 * the user's mental Principale view is the one we should be using in
 * production.
 */
export default async function DebugPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: account } = await supabase
    .from("channel_accounts")
    .select("encrypted_tokens, external_id")
    .eq("kind", "gmail")
    .not("encrypted_tokens", "is", null)
    .limit(1)
    .maybeSingle();

  if (!account?.encrypted_tokens) {
    return (
      <main style={{ padding: 24, fontFamily: "monospace" }}>
        <h1>Debug — no Gmail account connected.</h1>
      </main>
    );
  }

  const { accessToken } = await getValidAccessToken(account.encrypted_tokens as string);

  const queries = [
    { name: "in:inbox newer_than:30d", q: "in:inbox newer_than:30d" },
    { name: "category:primary newer_than:30d", q: "category:primary newer_than:30d" },
    {
      name: "in:inbox -category:promotions -category:social -category:updates -category:forums newer_than:30d",
      q: "in:inbox -category:promotions -category:social -category:updates -category:forums newer_than:30d",
    },
    {
      name: "is:important newer_than:30d",
      q: "is:important newer_than:30d",
    },
  ];

  type Row = {
    subject: string;
    from: string;
    date: string;
    labels: string[];
  };
  const results: Array<{ name: string; q: string; count: number; rows: Row[] }> = [];

  for (const { name, q } of queries) {
    const params = new URLSearchParams({ maxResults: "30", q });
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );
    if (!res.ok) {
      results.push({ name, q, count: -1, rows: [] });
      continue;
    }
    const list = (await res.json()) as {
      messages?: { id: string; threadId: string }[];
      resultSizeEstimate?: number;
    };
    const ids = (list.messages ?? []).slice(0, 15).map((m) => m.id);

    // Fetch full each so we get labels + headers
    const rows: Row[] = [];
    for (const id of ids) {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
      );
      if (!r.ok) continue;
      const m = (await r.json()) as GmailMessage;
      const headers = m.payload?.headers ?? [];
      const get = (n: string) =>
        headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";
      rows.push({
        subject: get("Subject").slice(0, 80),
        from: get("From").slice(0, 60),
        date: get("Date").slice(0, 30),
        labels: m.labelIds ?? [],
      });
    }
    results.push({ name, q, count: list.resultSizeEstimate ?? rows.length, rows });
  }

  // Also fetch the user's profile so we can sanity-check the connected account
  const profileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  const profile = profileRes.ok
    ? ((await profileRes.json()) as {
        emailAddress: string;
        messagesTotal: number;
        threadsTotal: number;
      })
    : null;

  return (
    <main style={{ padding: 24, fontFamily: "monospace", fontSize: 12, lineHeight: 1.4 }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Gmail debug</h1>
      <p style={{ marginBottom: 16 }}>
        Account: <strong>{profile?.emailAddress ?? account.external_id}</strong> ·{" "}
        {profile?.messagesTotal ?? "?"} messages total
      </p>

      {results.map((r) => (
        <section key={r.q} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, marginBottom: 4 }}>
            {r.name} <span style={{ color: "#888" }}>({r.count} matches, showing top {r.rows.length})</span>
          </h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                <th style={{ padding: 6, border: "1px solid #ddd" }}>From</th>
                <th style={{ padding: 6, border: "1px solid #ddd" }}>Subject</th>
                <th style={{ padding: 6, border: "1px solid #ddd" }}>Date</th>
                <th style={{ padding: 6, border: "1px solid #ddd" }}>Labels</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: 6, border: "1px solid #ddd" }}>{row.from}</td>
                  <td style={{ padding: 6, border: "1px solid #ddd" }}>{row.subject}</td>
                  <td style={{ padding: 6, border: "1px solid #ddd" }}>{row.date}</td>
                  <td style={{ padding: 6, border: "1px solid #ddd", color: "#0066cc" }}>
                    {row.labels.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}
