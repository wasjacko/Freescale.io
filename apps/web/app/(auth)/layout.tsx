import { Sprite } from "@/components/icons/Sprite";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <Sprite />
      {children}
    </div>
  );
}
