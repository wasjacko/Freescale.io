import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { privacyPolicy } from "@/lib/public-compliance";

export const metadata = { title: "Confidentialité - Freescale" };

export default function PrivacyPage() {
  return <PublicPolicyPage policy={privacyPolicy} />;
}
