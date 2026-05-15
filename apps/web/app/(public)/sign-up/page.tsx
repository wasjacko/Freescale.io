import { Sprite } from "@/components/icons/Sprite";
import { SignupWizard } from "@/components/signup/SignupWizard";

export const metadata = { title: "Démarrer · Freescale" };

export default function SignUpPage() {
  return (
    <div className="onb-page">
      <Sprite />
      <SignupWizard />
    </div>
  );
}
