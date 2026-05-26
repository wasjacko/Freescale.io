import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { supportInformation } from "@/lib/public-compliance";

export const metadata = { title: "Support - Freescale" };

export default function SupportPage() {
  return <PublicPolicyPage policy={supportInformation} />;
}
