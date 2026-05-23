import { Sprite } from "@/components/icons/Sprite";
import { ResetPasswordScreen } from "@/components/signup/ResetPasswordScreen";
import { Suspense } from "react";

export const metadata = { title: "Nouveau mot de passe · Freescale" };

export default function ResetPasswordPage() {
  return (
    <div className="onb-page">
      <Sprite />
      <Suspense>
        <ResetPasswordScreen />
      </Suspense>
    </div>
  );
}
