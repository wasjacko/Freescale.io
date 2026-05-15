import { Sprite } from "@/components/icons/Sprite";
import { ForgotPasswordScreen } from "@/components/signup/ForgotPasswordScreen";

export const metadata = { title: "Mot de passe oublié · Freescale" };

export default function ForgotPasswordPage() {
  return (
    <div className="onb-page">
      <Sprite />
      <ForgotPasswordScreen />
    </div>
  );
}
