/**
 * Logo officiel Freescale (wordmark cursif + « f » en gradient).
 * Le fichier vit dans apps/web/public/freescale-logo.svg → servi à /freescale-logo.svg.
 * (Si tu fournis un PNG, change l'extension ci-dessous.)
 */
export function FreescaleLogo({
  height = 22,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: asset statique simple (logo)
    <img
      src="/logowhitemode.png"
      alt="Freescale"
      height={height}
      className={className}
      style={{ height, width: "auto", display: "block", flexShrink: 0, maxWidth: "none" }}
    />
  );
}
