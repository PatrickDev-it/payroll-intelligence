import { expect, test } from "@playwright/test";
import { fromStatute, parseEuro } from "./statute.ts";

/**
 * The CCNL on screen. The load-bearing assertion is the negative one: switching
 * agreement must move the monthly figure and the employer's fund line, and must
 * leave the annual net untouched — because a collective agreement is not tax law.
 */

const AGREEMENTS = [
  { code: "CCNL_TERZIARIO_CONFCOMMERCIO", instalments: 14, fund: 144 },
  { code: "CCNL_METALMECCANICI_INDUSTRIA", instalments: 13, fund: 156 },
  { code: "CCNL_STUDI_PROFESSIONALI", instalments: 14, fund: 324 },
  { code: "NESSUNO", instalments: 12, fund: 0 },
];

test("the annual net is identical under every agreement", async ({ page }) => {
  const expected = fromStatute(45_000);

  for (const { code, instalments } of AGREEMENTS) {
    await page.goto(`/?gross=45000&ccnl=${code}&periods=${instalments}`);
    expect(parseEuro(await page.getByTestId("net-annual").innerText()), code).toBe(
      expected.netAnnual,
    );
  }
});

test("the instalment count moves the monthly figure, and only that", async ({ page }) => {
  await page.goto("/?gross=45000&ccnl=CCNL_TERZIARIO_CONFCOMMERCIO&periods=14");
  const over14 = parseEuro(await page.getByTestId("net-per-period").innerText());
  const annual14 = parseEuro(await page.getByTestId("net-annual").innerText());

  await page.goto("/?gross=45000&ccnl=CCNL_METALMECCANICI_INDUSTRIA&periods=13");
  const over13 = parseEuro(await page.getByTestId("net-per-period").innerText());
  const annual13 = parseEuro(await page.getByTestId("net-annual").innerText());

  expect(annual13).toBe(annual14);
  expect(over13).toBeGreaterThan(over14);
  expect(Math.abs(annual14 / 14 - over14)).toBeLessThan(0.01);
});

test("each agreement charges its own supplementary fund to the employer", async ({ page }) => {
  for (const { code, instalments, fund } of AGREEMENTS) {
    await page.goto(`/?gross=45000&ccnl=${code}&periods=${instalments}`);

    if (fund === 0) {
      await expect(page.getByTestId("amount-IT.CCNL.FONDO_SANITARIO")).toHaveCount(0);
      continue;
    }
    const line = page.getByTestId("employer-line-IT.CCNL.FONDO_SANITARIO");
    await expect(line, code).toBeVisible();
    await expect(line, code).toContainText(fund.toLocaleString("it-IT", { minimumFractionDigits: 2 }));
  }
});

test("the level dropdown follows the agreement", async ({ page }) => {
  await page.goto("/?gross=45000&ccnl=CCNL_TERZIARIO_CONFCOMMERCIO");
  await page.locator("#field-level").click();
  let levels = await page.getByRole("option").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-value")),
  );
  expect(levels).toContain("III");
  expect(levels).not.toContain("D1");

  await page.goto("/?gross=45000&ccnl=CCNL_METALMECCANICI_INDUSTRIA");
  await page.locator("#field-level").click();
  levels = await page.getByRole("option").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-value")),
  );
  expect(levels).toContain("D1");
  expect(levels).not.toContain("III");
});

test("a RAL below the contractual minimum warns without refusing", async ({ page }) => {
  await page.goto("/?gross=18000&ccnl=CCNL_TERZIARIO_CONFCOMMERCIO&level=III&periods=14");

  await expect(page.getByTestId("validation-notice")).toContainText("Sotto il minimo");
  // A warning, not a refusal: part-time legitimately sits below the floor.
  await expect(page.getByTestId("net-annual")).toBeVisible();
});

test("switching agreement updates the result live, no submit", async ({ page }) => {
  await page.goto("/?gross=45000");
  await page.locator("#field-ccnl").click();
  await page.locator('[role="option"][data-value="CCNL_STUDI_PROFESSIONALI"]').click();

  await expect(page.getByTestId("employer-line-IT.CCNL.FONDO_SANITARIO")).toContainText("324,00");
  await expect(page).toHaveURL(/\?lang=it$/);
  await page.reload();
  await expect(page.locator("#field-ccnl")).toHaveAttribute("data-value", "CCNL_STUDI_PROFESSIONALI");
});
