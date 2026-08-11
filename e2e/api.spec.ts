import { expect, test } from "@playwright/test";
import { fromStatute } from "./statute.ts";

/**
 * The engine over HTTP. The interesting assertions are the refusals: a country
 * with no adapter and a tax year with no rule set must come back as
 * distinguishable, documented states — never as a plausible number and never as
 * a 500.
 */

test.describe.configure({ mode: "parallel" });

test("returns a calculation that matches the statute", async ({ request }) => {
  const expected = fromStatute(45_000);
  const response = await request.post("/api/calculate", { data: { grossAnnual: 45_000 } });

  expect(response.status()).toBe(200);
  const body = await response.json();

  expect(body.employee.netAnnual.cents).toBe(Math.round(expected.netAnnual * 100));
  expect(body.employer.totalCost.cents).toBe(Math.round(expected.employerCost * 100));
});

test("stamps the engine and ruleset versions on the response", async ({ request }) => {
  const response = await request.post("/api/calculate", { data: { grossAnnual: 45_000 } });
  const body = await response.json();

  // When a figure is disputed, the first question is which rules produced it.
  // That has to be answerable from the response alone.
  expect(body.meta.rulesetVersion).toBe("2026.6");
  expect(body.meta.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  expect(body.meta.confidence).toBe("experimental");
  expect(body.meta.rulesApplied.length).toBeGreaterThan(5);
  expect(body.meta.releaseId).toBeTruthy();
  expect(response.headers()["x-payroll-release"]).toBe(body.meta.releaseId);
  expect(response.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("deep health executes one exact canary per supported country", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("payroll-calculator");
  expect(body.checks).toHaveLength(4);
  expect(body.checks.map((check: { country: string }) => check.country)).toEqual(["IT", "DE", "ES", "FR"]);
  expect(body.checks.every((check: { ok: boolean }) => check.ok)).toBe(true);
  expect(response.headers()["x-payroll-release"]).toBe(body.releaseId);
});

test("rejects oversized bodies before parsing or calculating", async ({ request }) => {
  const response = await request.post("/api/calculate", {
    headers: { "content-type": "application/json" },
    data: { grossAnnual: 45_000, padding: "x".repeat(70_000) },
  });
  expect(response.status()).toBe(413);
  expect((await response.json()).error.code).toBe("payload_too_large");
});

test("every line in the response cites the rule that produced it", async ({ request }) => {
  const body = await (await request.post("/api/calculate", { data: { grossAnnual: 45_000 } })).json();

  const walk = (lines: { id: string; ruleIds: string[]; children?: unknown[] }[]): void => {
    for (const line of lines) {
      expect(line.ruleIds.length, `${line.id} cites no rule`).toBeGreaterThan(0);
      if (line.children) walk(line.children as typeof lines);
    }
  };

  walk([
    ...body.employee.socialSecurity,
    ...body.employee.taxes,
    ...body.employee.credits,
    ...body.employer.contributions,
    ...body.employer.insurance,
    ...body.employer.severanceAccrual,
    ...body.employer.otherCosts,
  ]);
});

test("rejects a country outside the four-country product contract", async ({ request }) => {
  const response = await request.post("/api/calculate", {
    data: { country: "HU", grossAnnual: 45_000 },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("invalid_request");
  expect(body.error.issues.map((issue: { path: string }) => issue.path)).toContain("country");
});

test("refuses a tax year it has no rules for, rather than reusing last year's", async ({
  request,
}) => {
  const response = await request.post("/api/calculate", {
    data: { taxYear: 2025, grossAnnual: 45_000 },
  });

  expect(response.status()).toBe(422);
  const body = await response.json();
  expect(body.error.code).toBe("tax_year_not_available");
  expect(body.error.message).toContain("Refusing rather than reusing");
  expect(body.error.available).toContain(2026);
});

test("rejects a malformed request with the offending fields", async ({ request }) => {
  const response = await request.post("/api/calculate", {
    data: { grossAnnual: -1, payPeriods: 7 },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("invalid_request");
  expect(body.error.issues.map((i: { path: string }) => i.path)).toContain("grossAnnual");
});

test("rejects unknown payroll fields instead of silently ignoring an event", async ({ request }) => {
  const response = await request.post("/api/calculate", {
    data: { grossAnnual: 45_000, employmentStart: "2026-07-01" },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("invalid_request");
  expect(body.error.issues).toContainEqual({
    path: "employmentStart",
    message: "Unknown payroll input",
  });
});

test("is deterministic: the same request twice gives byte-identical figures", async ({
  request,
}) => {
  const call = async () =>
    (await request.post("/api/calculate", { data: { grossAnnual: 45_000 } })).json();

  const [a, b] = await Promise.all([call(), call()]);
  expect(a.employee).toEqual(b.employee);
  expect(a.employer).toEqual(b.employer);
  expect(a.rates).toEqual(b.rates);
});
