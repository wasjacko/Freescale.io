"use client";

import { useState, useTransition } from "react";
import { syncGmail, type SyncReport } from "@/lib/actions/connections";

/**
 * Manual resync trigger that shows the full sync report inline —
 * including the per-message error list. The autoSync path swallows
 * errors silently into the report and never surfaces them to the
 * user; this button is the only way to actually see why messages
 * aren't landing in the DB.
 */
export function DebugResyncButton({ channelAccountId }: { channelAccountId: string }) {
  const [report, setReport] = useState<SyncReport | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setReport(null);
    startTransition(async () => {
      try {
        const r = await syncGmail(channelAccountId);
        setReport(r);
      } catch (err) {
        setReport({
          fetched: 0,
          newConversations: 0,
          newMessages: 0,
          errors: [err instanceof Error ? err.message : String(err)],
        });
      }
    });
  };

  return (
    <section
      style={{
        marginBottom: 24,
        padding: 12,
        background: "#e0f2fe",
        border: "1px solid #7dd3fc",
      }}
    >
      <h2 style={{ fontSize: 14, marginBottom: 8 }}>Re-sync (verbose)</h2>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        style={{
          padding: "6px 14px",
          background: "#0284c7",
          color: "#fff",
          border: 0,
          borderRadius: 4,
          cursor: pending ? "wait" : "pointer",
          opacity: pending ? 0.6 : 1,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        {pending ? "Syncing…" : "Run syncGmail() now"}
      </button>

      {report && (
        <div style={{ marginTop: 12 }}>
          <p>
            fetched: <strong>{report.fetched}</strong> · newConversations:{" "}
            <strong>{report.newConversations}</strong> · newMessages:{" "}
            <strong>{report.newMessages}</strong>
          </p>
          {report.errors.length > 0 ? (
            <details open style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {report.errors.length} error{report.errors.length > 1 ? "s" : ""} (click to expand)
              </summary>
              <pre
                style={{
                  background: "#fee2e2",
                  padding: 8,
                  marginTop: 6,
                  maxHeight: 400,
                  overflow: "auto",
                  fontSize: 11,
                }}
              >
                {report.errors.join("\n")}
              </pre>
            </details>
          ) : (
            <p style={{ color: "#16a34a" }}>✓ No errors</p>
          )}
        </div>
      )}
    </section>
  );
}
