import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("WelcomeScreen Google sign-in", () => {
  it("starts Google OAuth directly without a redundant consent interstitial", async () => {
    const source = await readFile(new URL("./WelcomeScreen.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("google-consent");
    expect(source).not.toContain("Connecter Google + Gmail");
    expect(source).toContain("onClick={handleGoogleSignIn}");
  });

  it("does not force the Google consent prompt on routine sign-in", async () => {
    const source = await readFile(new URL("./WelcomeScreen.tsx", import.meta.url), "utf8");

    expect(source).toContain('access_type: "offline"');
    expect(source).not.toContain('prompt: "consent"');
  });
});
