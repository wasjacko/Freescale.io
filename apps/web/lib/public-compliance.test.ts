import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

describe("public App Store compliance surfaces", () => {
  it("publishes public privacy, terms, support and deletion pages", async () => {
    const [privacy, terms, support, deletion] = await Promise.all([
      source("../app/privacy/page.tsx"),
      source("../app/terms/page.tsx"),
      source("../app/support/page.tsx"),
      source("../app/account-deletion/page.tsx"),
    ]);

    expect(privacy).toContain("privacyPolicy");
    expect(terms).toContain("termsOfService");
    expect(support).toContain("supportInformation");
    expect(deletion).toContain("accountDeletionInformation");
  });

  it("discloses contact and the existing deletion initiation path", async () => {
    const content = await source("./public-compliance.ts");

    expect(content).toContain("hello@freescale.app");
    expect(content).toContain("/app/settings/profile");
    expect(content).toContain("Supprimer mon compte");
    expect(content).toContain("Mue");
  });

  it("links compliance routes from public product surfaces", async () => {
    const [landing, pricing] = await Promise.all([
      source("../app/page.tsx"),
      source("../app/pricing/page.tsx"),
    ]);

    for (const path of ["/support", "/privacy", "/terms", "/account-deletion"]) {
      expect(landing).toContain(path);
      expect(pricing).toContain(path);
    }
  });

  it("keeps support and legal destinations reachable in the policy page footer", async () => {
    const shell = await source("../components/legal/PublicPolicyPage.tsx");
    const footer = shell.slice(shell.indexOf('<footer className="policy-footer">'));

    for (const path of ["/support", "/privacy", "/terms", "/account-deletion"]) {
      expect(footer).toContain(`href="${path}"`);
    }
  });

  it("keeps every compliance page accessible without authentication", async () => {
    const middleware = await source("./supabase/middleware.ts");

    for (const path of ["/support", "/privacy", "/terms", "/account-deletion"]) {
      expect(middleware).toContain(`pathname === "${path}"`);
    }
  });
});
