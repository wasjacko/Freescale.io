export type LandingFlashPresentation = "signedout-toast" | "deleted-banner" | null;

export function getLandingFlashPresentation({
  signedOut,
  deleted,
}: {
  signedOut: boolean;
  deleted: boolean;
}): LandingFlashPresentation {
  if (deleted) return "deleted-banner";
  return signedOut ? "signedout-toast" : null;
}
