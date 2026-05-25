import { describe, expect, it } from "vitest";
import { getCronAuthorizationStatus } from "./cron-auth";

describe("cron authorization", () => {
  it("refuses execution when CRON_SECRET is not configured", () => {
    expect(getCronAuthorizationStatus(undefined, null)).toBe("misconfigured");
  });

  it("rejects requests whose bearer token does not match", () => {
    expect(getCronAuthorizationStatus("expected", "Bearer other")).toBe("unauthorized");
  });

  it("authorizes requests carrying the configured secret", () => {
    expect(getCronAuthorizationStatus("expected", "Bearer expected")).toBe("authorized");
  });
});
