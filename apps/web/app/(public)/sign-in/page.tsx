import { Suspense } from "react";
import { Sprite } from "@/components/icons/Sprite";
import { SignInScreen } from "@/components/signup/SignInScreen";

export const metadata = { title: "Se connecter · Freescale" };

export default function SignInPage() {
  return (
    <div className="onb-page">
      <Sprite />
      <Suspense>
        <SignInScreen />
      </Suspense>
    </div>
  );
}
