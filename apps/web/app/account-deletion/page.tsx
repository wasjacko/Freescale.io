import { PublicPolicyPage } from "@/components/legal/PublicPolicyPage";
import { accountDeletionInformation } from "@/lib/public-compliance";

export const metadata = { title: "Supprimer mon compte - Freescale" };

export default function AccountDeletionPage() {
  return <PublicPolicyPage policy={accountDeletionInformation} />;
}
