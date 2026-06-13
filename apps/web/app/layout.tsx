import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freescale — Client Communications OS",
  description: "Unified multi-channel inbox with AI copilot Mue",
  metadataBase: new URL("https://freescale.site"),
};

/**
 * Dark mode retiré : l'app suit à fond la DA claire éditoriale ("Complete AI").
 *
 * On verrouille <html data-theme="light"> côté serveur, donc les ~463 règles
 * [data-theme="dark"] de globals.css (laissées dormantes) ne s'activent jamais.
 * Plus besoin du cookie fs-theme, du client-hint, ni du script d'init FOUC :
 * il n'y a plus de flash possible puisque le thème est constant.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Fond clair + color-scheme posés en inline sur <html> : appliqués dès le
    // parsing du HTML, AVANT le chargement de globals.css et des fonts. Sans ça,
    // sur un OS en dark mode le canvas racine (html, fond transparent) flashe
    // sombre quelques ms le temps que le CSS externe peigne le fond du body.
    <html lang="fr" data-theme="light" style={{ backgroundColor: "#f8f9fa", colorScheme: "light" }}>
      <head>
        {/* Display serif for the art direction — elegant high-contrast italic
            used on prominent headings (Mue, empty states, panel titles). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        {/* App is light-only now — tell the browser so native controls,
            scrollbars and the initial canvas never render dark. */}
        <meta name="color-scheme" content="light" />
      </head>
      <body>{children}</body>
    </html>
  );
}
