import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Sprite } from "@/components/icons/Sprite";

// Public preview of the onboarding flow — used for design walkthroughs only.
// Does not write to the database.
export default function OnboardingPreviewPage() {
  return (
    <div className="onb-page">
      <Sprite />
      <OnboardingWizard
        initial={{
          firstName: "Wacil",
          lastName: "Ait",
          avatarUrl: null,
          email: "preview@freescale.app",
        }}
      />
    </div>
  );
}
