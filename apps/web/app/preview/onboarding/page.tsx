"use client";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Sprite } from "@/components/icons/Sprite";
import { useRouter } from "next/navigation";

/**
 * /preview/onboarding — route publique pour visualiser le parcours de
 * premier lancement complet, hors de l'état mock (déjà onboardé) qui le
 * masquerait dans /app. À la fin, on renvoie vers /app.
 */
export default function OnboardingPreviewPage() {
  const router = useRouter();
  return (
    <>
      <Sprite />
      <OnboardingFlow firstName="Wacil" onFinish={() => router.push("/app")} />
    </>
  );
}
