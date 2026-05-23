import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freescale — Client Communications OS",
  description: "Unified multi-channel inbox with AI copilot Mue",
  metadataBase: new URL("https://freescale.site"),
};

// FOUC prevention.
//
// We resolve the theme on the SERVER, so the very first HTML byte already
// carries the correct `data-theme` attribute on <html>. No flash, no race
// against CSS or hydration:
//
//   1. If the `fs-theme` cookie is present ("light"/"dark") → use it.
//   2. Otherwise we fall back to the OS preference from `Sec-CH-Prefers-Color-Scheme`
//      if the browser sent it (Chromium when we ask for it via Accept-CH).
//   3. As a last-resort safety net (Safari/Firefox don't send the hint),
//      a tiny inline <script> in <head> reads localStorage + matchMedia
//      and patches the attribute BEFORE any CSS paints.
//
// The script is also responsible for persisting a missing cookie when the
// user has only the legacy localStorage value, so subsequent reloads are
// SSR-perfect and never re-execute the script branch.
const themeInitScript = `(function(){try{var d=document.documentElement;var c=document.cookie.match(/(?:^|; )fs-theme=([^;]+)/);var cv=c?c[1]:null;var ls=null;try{ls=localStorage.getItem('fs-theme');}catch(e){}var pref=(ls==='light'||ls==='dark')?ls:(cv==='light'||cv==='dark')?cv:null;if(!pref&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){pref='dark';}var current=d.getAttribute('data-theme');if(pref&&current!==pref){d.setAttribute('data-theme',pref);}if(pref&&cv!==pref){document.cookie='fs-theme='+pref+'; path=/; max-age=31536000; SameSite=Lax';}}catch(e){}})();`;

type Theme = "light" | "dark";

async function resolveInitialTheme(): Promise<Theme | null> {
  // 1. Cookie set by ThemeToggle on prior render — the happy path.
  try {
    const store = await cookies();
    const v = store.get("fs-theme")?.value;
    if (v === "light" || v === "dark") return v;
  } catch {
    /* cookies() throws if called during static rendering — ignore */
  }

  // 2. Client Hint (Chromium). We opt in via the `Accept-CH` header below,
  //    so on the SECOND request the browser will send us this. On the first
  //    request the inline script handles it.
  try {
    const h = await headers();
    const hint = h.get("sec-ch-prefers-color-scheme");
    if (hint === "dark") return "dark";
    if (hint === "light") return "light";
  } catch {
    /* ignore */
  }

  return null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await resolveInitialTheme();

  // Drives the empty-canvas color the browser uses BEFORE any CSS loads.
  // - "light" when we know the user wants light → no dark flash on reload.
  // - "dark"  when we know they want dark → no light flash either.
  // - "light dark" only when we genuinely don't know (very first visit, no
  //   cookie, no hint) → let the OS decide; the inline script still
  //   patches data-theme before paint.
  const colorSchemeMeta = theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark";

  return (
    <html lang="fr" data-theme={theme ?? undefined} suppressHydrationWarning>
      <head>
        {/* Tells the browser which color scheme to use for the initial empty
            canvas + native form controls + scrollbars BEFORE CSS loads.
            This is the actual FOUC fix — without it, dark-OS users see a
            dark flash while the stylesheet is downloading. */}
        <meta name="color-scheme" content={colorSchemeMeta} />
        {/* Ask Chromium browsers to send the color-scheme hint on subsequent
            navigations so first-visit SSR can resolve theme without a script. */}
        <meta httpEquiv="Accept-CH" content="Sec-CH-Prefers-Color-Scheme" />
        {/* Safety net for first visit / browsers that don't send the hint
            and for legacy localStorage-only state. Runs synchronously before
            any CSS paints. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Static theme bootstrap contains no user input and must run before paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
