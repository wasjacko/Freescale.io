import { Sprite } from "@/components/icons/Sprite";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="onb-page">
      <Sprite />
      {children}
    </div>
  );
}
