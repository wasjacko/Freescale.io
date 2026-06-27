"use client";

// Logo fleur Mue — 5 pétales ronds organiques façon Brain², dégradé pastel.
// Partagé entre le panneau latéral et la page IA dédiée.
// Variante `animated` : les 5 couleurs convergent au centre (boule gradient +
// grain noise) puis reviennent à l'état fleur, en boucle.

import { useId } from "react";

export function MueFlower({ size = 56, animated = false }: { size?: number; animated?: boolean }) {
  // Couleurs de l'identité OFFICIELLE Freescale, ordonnées autour du cercle
  // (teal → bleu → violet → rouge → rose pâle) pour un dégradé fluide.
  const colors = ["#78AABF", "#6981B8", "#611C71", "#EB0020", "#E1B9B8"];
  // IDs de gradient UNIQUES par instance — sinon plusieurs MueFlower sur la
  // page partagent les mêmes ids et le paint server d'une instance cachée
  // casse le rendu des autres (fleur invisible).
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={animated ? "mue-flower mue-flower--anim" : "mue-flower"}
    >
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
        {animated && (
          <filter id={`mflw-noise-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0" />
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
        )}
      </defs>
      <g className="mue-flower-petals">
        {colors.map((_, i) => (
          <circle
            key={i}
            className="mue-flower-petal"
            cx="32"
            cy="20"
            r="13"
            fill={`url(#mflw-${uid}-${i})`}
            transform={`rotate(${i * 72} 32 32)`}
            style={{ mixBlendMode: "normal", opacity: animated ? 0.82 : 0.95 }}
          />
        ))}
      </g>
      {animated && (
        <circle
          className="mue-flower-noise"
          cx="32"
          cy="32"
          r="16"
          fill="#1b1140"
          filter={`url(#mflw-noise-${uid})`}
        />
      )}
    </svg>
  );
}
