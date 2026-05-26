import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { termsOfService } from "@/lib/public-compliance";

export const metadata = { title: "Conditions d'utilisation - Freescale" };

export default function TermsPage() {
  return <PublicPolicyPage policy={termsOfService} />;
}
