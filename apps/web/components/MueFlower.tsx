// Logo fleur Mue — 5 pétales ronds organiques façon Brain², dégradé pastel.
// Partagé entre le panneau latéral et la page IA dédiée.

import { useId } from "react";

export function MueFlower({ size = 56 }: { size?: number }) {
  // Couleurs de l'identité OFFICIELLE Freescale, ordonnées autour du cercle
  // (teal → bleu → violet → rouge → rose pâle) pour un dégradé fluide.
  const colors = ["#78AABF", "#6981B8", "#611C71", "#EB0020", "#E1B9B8"];
  // IDs de gradient UNIQUES par instance — sinon plusieurs MueFlower sur la
  // page (panneau + page Mue) partagent les mêmes ids et le paint server
  // d'une instance cachée casse le rendu des autres (fleur invisible).
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        {colors.map((c, i) => (
          <radialGradient
            key={c}
            id={`mflw-${uid}-${i}`}
            cx="0.5"
            cy="0.35"
            r="0.7"
            fx="0.5"
            fy="0.25"
          >
            <stop offset="0%" stopColor={c} stopOpacity="0.92" />
            <stop offset="100%" stopColor={c} stopOpacity="1" />
          </radialGradient>
        ))}
      </defs>
      {colors.map((_, i) => (
        <circle
          key={i}
          cx="32"
          cy="20"
          r="13"
          fill={`url(#mflw-${uid}-${i})`}
          transform={`rotate(${i * 72} 32 32)`}
          style={{ mixBlendMode: "normal", opacity: 0.95 }}
        />
      ))}
    </svg>
  );
}
