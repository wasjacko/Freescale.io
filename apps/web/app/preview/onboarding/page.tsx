import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/lib/contexts/DataContext";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { InboxData } from "@/lib/data/queries";

const EMPTY: InboxData = {
  workspaceId: null,
  conversations: [],
  messagesByConv: {},
  tasks: [],
  events: [],
  upcoming: [],
};

// Public preview of the onboarding modal layered on top of an empty AppShell.
// Used for design walkthroughs only — does not write to the database.
export default function OnboardingPreviewPage() {
  return (
    <>
      <DataProvider initial={EMPTY}>
        <AppShell
          user={{
            id: "preview",
            email: "preview@freescale.app",
            name: "Wacil Ait",
            firstName: "Wacil",
            avatarUrl: null,
            role: "Freelance Designer",
          }}
          initialActiveConvId=""
        />
      </DataProvider>
      <OnboardingWizard
        initial={{
          firstName: "Wacil",
          lastName: "Ait",
          avatarUrl: null,
          email: "preview@freescale.app",
        }}
      />
    </>
  );
}
