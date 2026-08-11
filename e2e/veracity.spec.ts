import { expect, test } from "@playwright/test";
import { fromStatute, parseEuro, parsePercent } from "./statute.ts";

/**
 * Veracity: what the page shows must equal what the statute prescribes.
 *
 * The expected values are not fixtures copied from the engine — they are
 * recomputed, in this file, from an independent longhand reading of the
 * articles (./statute.ts). If someone edits a rate in the rule JSON, this fails
 * unless they also change the independent implementation, which forces the
 * change to be a conscious, reviewed decision rather than a silent drift.
 */

/** Chosen to exercise every branch of the law, not to be round numbers. */
const CASES = [
  { gross: 15_000, exercises: "trattamento integrativo + somma integrativa at 5.3%" },
  { gross: 20_000, exercises: "somma integrativa at 4.8%, municipal surtax exempt" },
  { gross: 30_000, exercises: "EUR 65 bonus + ulteriore detrazione at the plateau" },
  { gross: 45_000, exercises: "the reference case: 33% bracket, credit taper" },
  { gross: 60_000, exercises: "43% bracket, credit exhausted, additional 1% IVS" },
  { gross: 100_000, exercises: "top bracket, no credits" },
  { gross: 150_000, exercises: "above the contributory ceiling" },
];

for (const { gross, exercises } of CASES) {
  test(`EUR ${gross.toLocaleString("en-US")} matches the statute — ${exercises}`, async ({ page }) => {
    const expected = fromStatute(gross);

    await page.goto(`/?gross=${gross}&periods=14&pensionCeilingStatus=subject`);

    const read = async (testId: string) =>
      parseEuro((await page.getByTestId(testId).innerText()).trim());

    expect(await read("net-annual"), "annual net").toBe(expected.netAnnual);
    expect(await read("net-per-period"), "net per instalment").toBe(expected.netPerPeriod);
    expect(await read("employer-total"), "employer cost").toBe(expected.employerCost);

    const wedge = parsePercent(await page.getByTestId("tax-wedge").innerText());
    expect(Math.abs(wedge - expected.taxWedge), "tax wedge").toBeLessThan(0.001);
  });
}

test("every displayed withholding matches the article that produces it", async ({ page }) => {
  const gross = 45_000;
  const expected = fromStatute(gross);
  await page.goto(`/?gross=${gross}&periods=14`);

  const lineAmount = async (ruleId: string) =>
    Math.abs(parseEuro(await page.getByTestId(`amount-${ruleId}`).innerText()));

  // art. 51 c. 2 lett. a TUIR — contributions come off before the tax base.
  expect(await lineAmount("IT.INPS.EMPLOYEE.IVS")).toBe(expected.contributions);

  // art. 11 TUIR, net of art. 13 credits, rounded to the euro.
  expect(await lineAmount("IT.IRPEF")).toBe(expected.irpefNet);

  // L.R. Lombardia 10/2003 art. 72 — per slice, not on the whole base.
  expect(await lineAmount("IT.ADDIZIONALE.REGIONALE.LOMBARDIA")).toBe(expected.regionalSurtax);

  // D.Lgs. 360/1998 — whole base above the exemption, nothing below it.
  expect(await lineAmount("IT.ADDIZIONALE.COMUNALE.MILANO")).toBe(expected.municipalSurtax);
});

test("the breakdown reconciles on screen: gross minus withholdings equals the net", async ({
  page,
}) => {
  await page.goto("/?gross=45000&periods=14");

  const gross = parseEuro(await page.getByTestId("gross").innerText());
  const withheld = parseEuro(await page.getByTestId("withheld").innerText());
  const net = parseEuro(await page.getByTestId("net-annual").innerText());

  // The hero rounds to whole euros; the reconciliation must hold within that.
  expect(Math.abs(gross - withheld - net)).toBeLessThan(1);
});

test("the Milan cliff is shown, and warned about, exactly where the law puts it", async ({
  page,
}) => {
  // Taxable income crosses EUR 23,000 at gross 25,328.
  const below = fromStatute(25_327);
  const above = fromStatute(25_328);
  expect(below.taxableIncome, "fixture straddles the threshold").toBeLessThanOrEqual(23_000);
  expect(above.taxableIncome).toBeGreaterThan(23_000);
  expect(below.municipalSurtax).toBe(0);
  expect(above.municipalSurtax).toBeGreaterThan(180);

  await page.goto("/?gross=25327");
  const netBelow = parseEuro(await page.getByTestId("net-annual").innerText());
  await expect(page.getByTestId("cliff-notice")).toBeVisible();

  await page.goto("/?gross=25328");
  const netAbove = parseEuro(await page.getByTestId("net-annual").innerText());

  // One euro more gross, about EUR 183 less in hand — and the page says so.
  expect(netBelow - netAbove).toBeGreaterThan(180);
  await expect(page.getByTestId("cliff-notice")).toContainText("non un errore di calcolo");
});

test("the net can exceed the gross at low incomes, because the supplements are cash", async ({
  page,
}) => {
  const expected = fromStatute(9_361);
  expect(expected.netAnnual, "statute agrees this is above gross").toBeGreaterThan(9_361);

  await page.goto("/?gross=9361");
  expect(parseEuro(await page.getByTestId("net-annual").innerText())).toBe(expected.netAnnual);
});

test("every rate on screen is derived from the same figures", async ({ page }) => {
  await page.goto("/?gross=45000");

  const wedge = parsePercent(await page.getByTestId("tax-wedge").innerText());
  const net = parseEuro(await page.getByTestId("net-annual").innerText());
  const cost = parseEuro(await page.getByTestId("employer-total").innerText());

  expect(Math.abs(wedge - (cost - net) / cost)).toBeLessThan(0.001);

  // The marginal rate must exceed the effective one in this band — that gap is
  // the credit taper, and it is the reason the panel exists.
  const marginal = parsePercent(await page.getByTestId("marginal-rate").innerText());
  expect(marginal).toBeGreaterThan(0.45);
  expect(marginal).toBeLessThan(0.52);
});

test("provenance is present and every rule is attributed", async ({ page }) => {
  await page.goto("/?gross=45000");

  await expect(page.getByTestId("provenance")).toBeVisible();
  await expect(page.getByTestId("rule-count")).toContainText("regole");

  // INAIL is employer-specific, so the source register must still expose its
  // experimental status even though the summary intentionally stays focused
  // on the result and its single “Metodo e fonti” action.
  await expect(
    page.locator('[data-testid="confidence-badge"][data-tier="experimental"]').first(),
  ).toBeAttached();
});

test("opening a line reveals its derivation and its source", async ({ page }) => {
  await page.goto("/?gross=45000");

  const row = page.getByTestId("line-IT.ADDIZIONALE.COMUNALE.MILANO");
  await row.locator(":scope > summary").click();

  await expect(row).toContainText("> 23.000,00");
  await expect(row).toContainText("IT.ADDIZIONALE.COMUNALE.MILANO");
  await expect(row).toContainText("esenzione fino a 23.000");
});
