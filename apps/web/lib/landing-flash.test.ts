import { describe, expect, it } from "vitest";
import { getLandingFlashPresentation } from "./landing-flash";

describe("landing flash presentation", () => {
  it("uses a quiet toast after sign-out", () => {
    expect(getLandingFlashPresentation({ signedOut: true, deleted: false })).toBe(
      "signedout-toast"
    );
  });

  it("keeps account deletion as a prominent banner", () => {
    expect(getLandingFlashPresentation({ signedOut: false, deleted: true })).toBe("deleted-banner");
  });

  it("prioritizes the deletion confirmation when both flags are present", () => {
    expect(getLandingFlashPresentation({ signedOut: true, deleted: true })).toBe("deleted-banner");
  });
});
