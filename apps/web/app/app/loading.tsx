"use client";

export default function Loading() {
  return (
    <div className="app view-inbox" style={{ opacity: 0.85 }}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span
            className="sidebar-logo-mark"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(15,23,42,0.06)",
              display: "inline-block",
            }}
          />
        </div>
        <div
          className="sidebar-nav"
          style={{ gap: 8, display: "flex", flexDirection: "column", padding: 12 }}
        >
          <div style={{ height: 40, borderRadius: 8, background: "rgba(15,23,42,0.04)" }} />
          <div style={{ height: 40, borderRadius: 8, background: "rgba(15,23,42,0.04)" }} />
          <div style={{ height: 40, borderRadius: 8, background: "rgba(15,23,42,0.04)" }} />
          <div style={{ height: 40, borderRadius: 8, background: "rgba(15,23,42,0.04)" }} />
        </div>
      </aside>
      <div className="workspace">
        <div className="conv-shell">
          <section className="inbox">
            <header className="panel-head">
              <div
                className="inbox-header-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  <div
                    style={{
                      width: 60,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(15,23,42,0.06)",
                    }}
                  />
                  <div
                    style={{
                      width: 70,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(15,23,42,0.04)",
                    }}
                  />
                  <div
                    style={{
                      width: 65,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(15,23,42,0.04)",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div
                    style={{
                      width: 120,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(15,23,42,0.04)",
                    }}
                  />
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(15,23,42,0.04)",
                    }}
                  />
                </div>
              </div>
            </header>
            <div className="conv-list">
              <div className="conv-skel-list" aria-busy="true">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="conv-skel">
                    <span className="conv-skel-av" style={{ animationDelay: `${idx * 0.15}s` }} />
                    <span className="conv-skel-main">
                      <span
                        className="conv-skel-line conv-skel-name"
                        style={{ width: "35%", animationDelay: `${idx * 0.15}s` }}
                      />
                      <span
                        className="conv-skel-line conv-skel-preview"
                        style={{ width: "80%", animationDelay: `${idx * 0.15}s` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
