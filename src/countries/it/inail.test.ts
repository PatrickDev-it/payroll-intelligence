import { describe, expect, it } from "vitest";
import { ITALIAN_INAIL_RISK_OPTIONS, indicativeInailPercent } from "./inail.ts";

describe("Italian INAIL control data", () => {
  it("derives every indicative percentage from the calculation rule", () => {
    expect(
      Object.fromEntries(
        ITALIAN_INAIL_RISK_OPTIONS.map(({ value }) => [
          value,
          indicativeInailPercent(value, 2026),
        ]),
      ),
    ).toEqual({
      office: "0.4",
      retail: "1.5",
      manufacturing: "4",
      construction: "9",
    });
  });

  it("always supplies a nonempty fallback when no rule set exists", () => {
    expect(indicativeInailPercent("office", 1900)).toBe("0");
  });
});
