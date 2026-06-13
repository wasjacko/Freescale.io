"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
        background: "var(--bg-canvas, #fafafa)",
        color: "var(--text-main, #0f172a)",
        fontFamily: "var(--font-sans, sans-serif)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.08)",
          color: "var(--brand-rose, #f43f5e)",
          display: "grid",
          placeItems: "center",
          marginBottom: 24,
          fontSize: 28,
          fontWeight: "bold",
          animation: "pulse 2s infinite",
        }}
        aria-hidden="true"
      >
        ✕
      </div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        Une erreur est survenue
      </h1>
      <p
        style={{
          fontSize: 14,
          opacity: 0.7,
          maxWidth: 380,
          lineHeight: 1.5,
          marginBottom: 32,
        }}
      >
        L'application a rencontré un problème inattendu lors du chargement ou du rendu de cette vue.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 18px",
            borderRadius: 9999,
            background: "transparent",
            color: "var(--text-main, #0f172a)",
            border: "1px solid rgba(15,23,42,0.12)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          Recharger la page
        </button>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "10px 18px",
            borderRadius: 9999,
            background: "var(--text-main, #0f172a)",
            color: "var(--bg-canvas, #ffffff)",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
