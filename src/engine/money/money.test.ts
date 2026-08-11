import { describe, expect, it } from "vitest";
import {
  CurrencyMismatchError,
  InvalidDeclaredPercentageError,
  InvalidRateError,
  add,
  applyRate,
  clampAtZero,
  fromCents,
  money,
  parseDeclaredPercentage,
  rate,
  roundToUnit,
  subtract,
  sum,
  toMoney,
  toPrecise,
  zero,
} from "./money.ts";

describe("declared percentages", () => {
  it("parses percentage points exactly to a rate", () => {
    expect(parseDeclaredPercentage("1.234567")).toEqual({
      decimal: "1.234567",
      rate: { ppb: 12_345_670n },
    });
    expect(parseDeclaredPercentage("100").rate.ppb).toBe(1_000_000_000n);
    expect(parseDeclaredPercentage(9.19).rate.ppb).toBe(91_900_000n);
  });

  it("refuses implicit rounding and non-decimal spellings", () => {
    for (const input of ["1.2345678", "1e-3", "-0.1", "100.000001", " 9.19", "9,19"]) {
      expect(() => parseDeclaredPercentage(input)).toThrow(InvalidDeclaredPercentageError);
    }
    expect(() => parseDeclaredPercentage(0.0000001)).toThrow(InvalidDeclaredPercentageError);
  });
});

describe("rate", () => {
  it("parses a decimal string exactly, without touching floating point", () => {
    expect(rate("0.0919").ppb).toBe(91_900_000n);
    expect(rate("0.2381").ppb).toBe(238_100_000n);
    expect(rate("1").ppb).toBe(1_000_000_000n);
    expect(rate("0.000000001").ppb).toBe(1n);
  });

  it("refuses anything that is not an exact decimal", () => {
    expect(() => rate("9.19%")).toThrow(InvalidRateError);
    expect(() => rate("1/3")).toThrow(InvalidRateError);
    expect(() => rate("0.0000000001")).toThrow(InvalidRateError); // sub-ppb
  });
});

describe("no floating point drift", () => {
  it("adds a tenth and a fifth of a euro to exactly thirty cents", () => {
    // 0.1 + 0.2 !== 0.3 in IEEE 754. It must here.
    const total = add(fromCents(10, "EUR"), fromCents(20, "EUR"));
    expect(total.cents).toBe(30);
  });

  it("survives ten thousand additions of one cent", () => {
    let total = zero("EUR");
    for (let i = 0; i < 10_000; i++) total = add(total, fromCents(1, "EUR"));
    expect(total.cents).toBe(10_000);
  });
});

describe("applyRate", () => {
  it("computes the Italian employee contribution on the reference case", () => {
    // 45,000.00 x 9.19% = 4,135.50 exactly
    const contribution = toMoney(applyRate(toPrecise(money(45_000, "EUR")), rate("0.0919")), "EUR");
    expect(contribution.cents).toBe(413_550);
  });

  it("keeps sub-cent precision in the intermediate", () => {
    // 1 cent x 0.5 = 0.5 cent -> survives as 500_000 micro-cents
    expect(applyRate(toPrecise(fromCents(1, "EUR")), rate("0.5"))).toBe(500_000n);
  });

  it("rounds a slice only when it is materialised as Money", () => {
    // 12,864.50 x 33% = 4,245.285 -> half-up at the cent -> 4,245.29
    const precise = applyRate(toPrecise(fromCents(1_286_450, "EUR")), rate("0.33"));
    expect(toMoney(precise, "EUR").cents).toBe(424_529);
    expect(toMoney(precise, "EUR", "floor").cents).toBe(424_528);
  });
});

describe("rounding modes", () => {
  const half = 500_000n; // half a cent

  it("half-up rounds away from zero at the midpoint", () => {
    expect(toMoney(half, "EUR", "half-up").cents).toBe(1);
    expect(toMoney(-half, "EUR", "half-up").cents).toBe(-1);
  });

  it("half-even rounds to the even neighbour at the midpoint", () => {
    expect(toMoney(half, "EUR", "half-even").cents).toBe(0);
    expect(toMoney(1_500_000n, "EUR", "half-even").cents).toBe(2);
  });

  it("floor and ceil move consistently for negatives", () => {
    expect(toMoney(-half, "EUR", "floor").cents).toBe(-1);
    expect(toMoney(-half, "EUR", "ceil").cents).toBe(0);
  });
});

describe("roundToUnit — statutory rounding", () => {
  it("rounds to an explicitly requested whole-unit boundary", () => {
    expect(roundToUnit(fromCents(989_216, "EUR"), 100).cents).toBe(989_200);
    expect(roundToUnit(fromCents(989_250, "EUR"), 100).cents).toBe(989_300);
    expect(roundToUnit(fromCents(989_249, "EUR"), 100).cents).toBe(989_200);
  });

  it("refuses a non-positive unit rather than guessing", () => {
    expect(() => roundToUnit(money(1, "EUR"), 0)).toThrow(TypeError);
  });
});

describe("guards", () => {
  it("refuses to combine two currencies", () => {
    expect(() => add(money(1, "EUR"), money(1, "SEK"))).toThrow(CurrencyMismatchError);
  });

  it("refuses a fractional cent", () => {
    expect(() => fromCents(1.5, "EUR")).toThrow(TypeError);
  });

  it("refuses a fractional major unit, pointing at fromCents", () => {
    expect(() => money(45_000.5, "EUR")).toThrow(TypeError);
  });
});

describe("clampAtZero", () => {
  it("stops credits from turning tax negative", () => {
    expect(clampAtZero(fromCents(-1, "EUR")).cents).toBe(0);
    expect(clampAtZero(fromCents(1, "EUR")).cents).toBe(1);
  });
});

describe("sum", () => {
  it("returns zero in the stated currency for an empty list", () => {
    expect(sum([], "EUR")).toEqual({ cents: 0, currency: "EUR" });
  });

  it("adds signed lines so a breakdown reconciles to the net", () => {
    const gross = money(45_000, "EUR");
    const withheld = [fromCents(-413_550, "EUR"), fromCents(-989_200, "EUR")];
    const net = sum([gross, ...withheld], "EUR");
    expect(net.cents).toBe(4_500_000 - 413_550 - 989_200);
    expect(subtract(gross, net).cents).toBe(413_550 + 989_200);
  });
});
