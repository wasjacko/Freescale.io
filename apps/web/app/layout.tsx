import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freescale — Client Communications OS",
  description: "Unified multi-channel inbox with AI copilot Mue",
  metadataBase: new URL("https://freescale.site"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
