import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freescale — Client Communications OS",
  description: "Unified multi-channel inbox with AI copilot Mue",
  metadataBase: new URL("https://freescale.site"),
};

/**
 * Thème : mode « Système » par défaut, surchargeable en Clair/Sombre.
 *
 * Le serveur ne sait pas quel thème servir (cookie absent volontairement —
 * on garde le persist côté client uniquement). On évite le FOUC en
 * injectant un petit script bloquant dans <head> qui détermine le bon
 * data-theme avant le premier paint :
 *
 *   1) lit fs:app dans localStorage → state.theme (system | light | dark)
 *   2) si « system » ou absent, suit prefers-color-scheme
 *   3) pose <html data-theme="…"> + style.colorScheme avant que la page
 *      ne soit peinte → pas de flash, même sur un OS sombre
 */
const themeInitScript = `
(function(){
  try {
    var t = 'system';
    var raw = localStorage.getItem('fs:app');
    if (raw) {
      var parsed = JSON.parse(raw);
      var v = parsed && parsed.state && parsed.state.theme;
      if (v === 'light' || v === 'dark' || v === 'system') t = v;
    }
    var effective = t;
    if (t === 'system') {
      effective = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var r = document.documentElement;
    r.setAttribute('data-theme', effective);
    r.style.colorScheme = effective;
  } catch (e) {}
})();
`.trim();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC : doit s'exécuter AVANT le rendu pour poser data-theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Tell the browser to follow the system → scrollbars / native controls
            auto-adapt. Le data-theme posé par le script ci-dessus surcharge si
            l'utilisateur a forcé clair/sombre. */}
        <meta name="color-scheme" content="light dark" />
        {/* Display serif for the art direction — elegant high-contrast italic
            used on prominent headings (Mue, empty states, panel titles). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        {/* HK Grotesk (version open source « Hanken Grotesk » du même fondeur) :
            police de toute l'UI, sauf le logo qui garde son serif. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Polices manuscrites épaisses pour les accents tactiles (phrase
            d'accueil de Mue, signatures…). Permanent Marker = marker épais ;
            Caveat Brush en fallback (calligraphie pinceau). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Caveat+Brush&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
