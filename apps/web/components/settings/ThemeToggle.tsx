"use client";

import { useEffect, useState } from "react";

/**
 * Three-way theme toggle (Auto / Light / Dark). Persists the choice in
 * localStorage under "fs-theme" and applies it to <html data-theme=…>
 * for the existing [data-theme="dark"] CSS rules to take over.
 *
 *   - "auto" → no attribute → CSS @media (prefers-color-scheme) decides
 *   - "light" → data-theme="light" → forces light, even on dark OS
 *   - "dark"  → data-theme="dark"  → forces dark, even on light OS
 *
 * The initial paint is handled by the inline script in app/layout.tsx
 * so the page doesn't flash the wrong theme before this component
 * mounts. We only hydrate the state + write on user change.
 */

type Theme = "auto" | "light" | "dark";
const STORAGE_KEY = "fs-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "auto";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore quota / storage-disabled */
  }
  return "auto";
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  // Hydrate from localStorage on mount. Can't read it during SSR.
  useEffect(() => {
    setTheme(readStored());
  }, []);

  const pick = (next: Theme) => {
    setTheme(next);
    apply(next);
    try {
      if (next === "auto") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Thème">
      {(["auto", "light", "dark"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={theme === opt}
          className={`theme-toggle-btn ${theme === opt ? "is-active" : ""}`}
          onClick={() => pick(opt)}
        >
          {opt === "auto" && (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 1 0-18z" fill="currentColor" />
              </svg>
              <span>Auto</span>
            </>
          )}
          {opt === "light" && (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <span>Clair</span>
            </>
          )}
          {opt === "dark" && (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span>Sombre</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
