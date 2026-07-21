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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logowhitemode.png"
      alt="Freescale"
      height={height}
      className={className}
      style={{ height, width: "auto", flexShrink: 0, maxWidth: "none" }}
    />
  );
}
