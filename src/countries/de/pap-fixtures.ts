/** Reproducible evidence captured from the official BMF 2026 external interface. */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { fromCents } from "@engine/money/money.ts";
import rawFixtures from "./pap-fixtures.json";

export const BMF_PAP_REQUIRED_INPUTS = [
  "AF",
  "AJAHR",
  "ALTER1",
  "ALV",
  "F",
  "JFREIB",
  "JHINZU",
  "JRE4",
  "JRE4ENT",
  "JVBEZ",
  "KRV",
  "KVZ",
  "LZZ",
  "LZZFREIB",
  "LZZHINZU",
  "MBV",
  "PKPV",
  "PKPVAGZ",
  "PKV",
  "PVA",
  "PVS",
  "PVZ",
  "R",
  "RE4",
  "SONSTB",
  "SONSTENT",
  "STERBE",
  "STKL",
  "VBEZ",
  "VBEZM",
  "VBEZS",
  "VBS",
  "VJAHR",
  "ZKF",
  "ZMVB",
] as const;

export type BmfPapInputName = (typeof BMF_PAP_REQUIRED_INPUTS)[number];
export type BmfPapInputs = Readonly<Record<BmfPapInputName, string | number>>;

export type BmfPapFixture = {
  readonly id: string;
  readonly papPublicationDate: string;
  readonly papFileUrl: string;
  readonly officialInterfaceUrl: string;
  readonly extractionMethod: string;
  readonly accessedAt: string;
  readonly sourceChecksumSha256: string;
  readonly evidenceStatus: "verified";
  readonly inputs: BmfPapInputs;
  readonly officialOutputs: {
    readonly LSTLZZ: number;
    readonly SOLZLZZ: number;
  };
  readonly expectedEngineLines: readonly string[];
  readonly allowedToleranceCents: number;
};

export const DE_BMF_PAP_FIXTURES: readonly BmfPapFixture[] = parseFixtures(rawFixtures);

type FixtureLike = Omit<BmfPapFixture, "inputs"> & {
  readonly inputs: Readonly<Record<string, string | number>>;
};

/**
 * Translate a complete PAP vector into the deliberately narrower employee
 * profile represented by this product. Any non-zero unsupported PAP branch is
 * refused instead of being flattened into the stable-salary scenario.
 */
export function profileFromPapFixture(fixture: FixtureLike): EmployeeProfile {
  assertCompleteInputs(fixture.inputs, fixture.id);
  const input = fixture.inputs as BmfPapInputs;

  assertEquals(input, "LZZ", 1, fixture.id);
  assertEquals(input, "AF", 0, fixture.id);
  assertEquals(input, "F", 1, fixture.id);
  assertEquals(input, "AJAHR", 0, fixture.id);
  assertEquals(input, "ALTER1", 0, fixture.id);
  assertEquals(input, "ALV", 0, fixture.id);
  assertEquals(input, "KRV", 0, fixture.id);
  assertEquals(input, "PKV", 0, fixture.id);
  for (const name of [
    "JFREIB",
    "JHINZU",
    "JRE4",
    "JRE4ENT",
    "JVBEZ",
    "LZZFREIB",
    "LZZHINZU",
    "MBV",
    "PKPV",
    "PKPVAGZ",
    "SONSTB",
    "SONSTENT",
    "STERBE",
    "VBEZ",
    "VBEZM",
    "VBEZS",
    "VBS",
    "VJAHR",
    "ZKF",
    "ZMVB",
  ] as const) {
    assertEquals(input, name, 0, fixture.id);
  }

  const steuerklasse = steuerklasseOf(input.STKL, fixture.id);
  const grossCents = Number(input.RE4);
  if (!Number.isSafeInteger(grossCents) || grossCents <= 0) {
    throw new TypeError(`${fixture.id}: RE4 must be positive integer cents`);
  }

  const pvz = binary(input.PVZ, "PVZ", fixture.id);
  const pvs = binary(input.PVS, "PVS", fixture.id);
  const careDiscounts = Number(input.PVA);
  if (!Number.isInteger(careDiscounts) || careDiscounts < 0 || careDiscounts > 4) {
    throw new TypeError(`${fixture.id}: PVA must be an integer from 0 through 4`);
  }
  const parent = pvz === 0;
  const qualifyingChildren = parent ? Math.max(1, careDiscounts + 1) : 0;

  return {
    country: "DE",
    region: pvs === 1 ? "SN" : "BE",
    taxYear: 2026,
    grossAnnual: fromCents(grossCents, "EUR"),
    payPeriods: 12,
    employmentType: "employee",
    contractType: "permanent",
    workingTimePercent: 100,
    companySize: 31,
    age: 30,
    countryOptions: {
      steuerklasse,
      churchMember: Number(input.R) === 0 ? "no" : "yes",
      hasParentStatus: parent,
      qualifyingChildrenUnder25: qualifyingChildren,
      zusatzbeitragRatePercent: String(input.KVZ),
      unfallRatePercent: "0.50",
      u2RatePercent: "0.44",
    },
  };
}

function parseFixtures(value: unknown): readonly BmfPapFixture[] {
  if (!Array.isArray(value)) throw new TypeError("German PAP fixtures must be an array");
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new TypeError(`German PAP fixture ${index} must be an object`);
    const id = typeof entry.id === "string" ? entry.id : `German PAP fixture ${index}`;
    for (const key of [
      "papPublicationDate",
      "papFileUrl",
      "officialInterfaceUrl",
      "extractionMethod",
      "accessedAt",
    ] as const) {
      if (typeof entry[key] !== "string" || entry[key].length === 0) {
        throw new TypeError(`${id}: ${key} must be a non-empty string`);
      }
    }
    if (
      typeof entry.sourceChecksumSha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(entry.sourceChecksumSha256)
    ) {
      throw new TypeError(`${id}: sourceChecksumSha256 must be a lowercase SHA-256 digest`);
    }
    if (entry.evidenceStatus !== "verified") {
      throw new TypeError(`${id}: BMF interface fixture must explicitly declare verified evidence`);
    }
    if (!isRecord(entry.inputs)) throw new TypeError(`${id}: inputs must be an object`);
    assertCompleteInputs(entry.inputs, id);
    if (!isRecord(entry.officialOutputs)) {
      throw new TypeError(`${id}: officialOutputs must be an object`);
    }
    for (const output of ["LSTLZZ", "SOLZLZZ"] as const) {
      if (!Number.isSafeInteger(entry.officialOutputs[output]) || Number(entry.officialOutputs[output]) < 0) {
        throw new TypeError(`${id}: official output ${output} must be non-negative integer cents`);
      }
    }
    if (!Number.isSafeInteger(entry.allowedToleranceCents) || Number(entry.allowedToleranceCents) < 0) {
      throw new TypeError(`${id}: allowedToleranceCents must be a non-negative integer`);
    }
    if (
      !Array.isArray(entry.expectedEngineLines) ||
      entry.expectedEngineLines.length === 0 ||
      !entry.expectedEngineLines.every((line) => typeof line === "string" && line.length > 0)
    ) {
      throw new TypeError(`${id}: expectedEngineLines must name at least one calculation line`);
    }
    return entry as BmfPapFixture;
  });
}

function assertCompleteInputs(
  inputs: Readonly<Record<string, unknown>>,
  fixtureId: string,
): asserts inputs is BmfPapInputs {
  const required = new Set<string>(BMF_PAP_REQUIRED_INPUTS);
  for (const name of required) {
    const value = inputs[name];
    if (typeof value !== "string" && typeof value !== "number") {
      throw new TypeError(`${fixtureId}: missing PAP input ${name}`);
    }
  }
  for (const name of Object.keys(inputs)) {
    if (!required.has(name)) throw new TypeError(`${fixtureId}: unknown PAP input ${name}`);
  }
}

function assertEquals(
  inputs: Readonly<Record<string, string | number>>,
  name: BmfPapInputName,
  expected: number,
  fixtureId: string,
): void {
  if (Number(inputs[name]) !== expected) {
    throw new TypeError(`${fixtureId}: PAP input ${name}=${String(inputs[name])} is outside the represented scope`);
  }
}

function steuerklasseOf(value: string | number, fixtureId: string): "I" | "II" | "III" | "IV" {
  const classes = { 1: "I", 2: "II", 3: "III", 4: "IV" } as const;
  const result = classes[Number(value) as keyof typeof classes];
  if (!result) throw new TypeError(`${fixtureId}: unsupported PAP STKL ${String(value)}`);
  return result;
}

function binary(value: string | number, name: string, fixtureId: string): 0 | 1 {
  const parsed = Number(value);
  if (parsed !== 0 && parsed !== 1) throw new TypeError(`${fixtureId}: ${name} must be 0 or 1`);
  return parsed as 0 | 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
