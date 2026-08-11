import { describe, expect, it } from "vitest";
import { isAtLeast, lowestConfidence } from "./confidence.ts";

describe("lowestConfidence", () => {
  it("takes the minimum, never an average", () => {
    expect(lowestConfidence(["verified", "verified", "experimental"])).toBe("experimental");
    expect(lowestConfidence(["verified", "supported"])).toBe("supported");
    expect(lowestConfidence(["verified", "verified"])).toBe("verified");
  });

  it("treats a result with no cited rules as experimental, not verified", () => {
    // No provenance is the weakest claim available, not the strongest.
    expect(lowestConfidence([])).toBe("experimental");
  });

  it("lets one experimental employer line demote a verified employee calculation", () => {
    // The INAIL rate is employer-specific and has no honest default, so an
    // Italian result that includes it cannot be presented as fully verified.
    const employeeLines = ["verified", "verified", "verified"] as const;
    const inail = "experimental" as const;
    expect(lowestConfidence([...employeeLines, inail])).toBe("experimental");
  });
});

describe("isAtLeast", () => {
  it("orders the tiers", () => {
    expect(isAtLeast("verified", "supported")).toBe(true);
    expect(isAtLeast("supported", "verified")).toBe(false);
    expect(isAtLeast("experimental", "experimental")).toBe(true);
  });
});
