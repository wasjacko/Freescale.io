import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freescale — Client Communications OS",
  description: "Unified multi-channel inbox with AI copilot Mue",
  metadataBase: new URL("https://freescale.site"),
};

// Inline script that runs BEFORE first paint to apply the user's stored
// theme preference. Three modes:
//   - "light" / "dark" → forces data-theme=<mode> on <html>
//   - "auto" (default) → follows prefers-color-scheme via @media in CSS
// The script is small enough to hand-inline so we avoid the flash of
// wrong theme that happens with React-only hydration paths.
const themeInitScript = `(function() {
  try {
    var pref = localStorage.getItem('fs-theme');
    if (pref === 'light' || pref === 'dark') {
      document.documentElement.setAttribute('data-theme', pref);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
