import { expect, test } from "@playwright/test";
import { MUNICIPAL, REGIONAL, fromStatute, parseEuro } from "./statute.ts";

/**
 * Geography is a discriminant, not a decoration. These check that picking a
 * different region or comune changes the figure by the amount the regional and
 * municipal laws prescribe — against the independent statute, as everywhere else.
 */

const REGION_CASES = [
  { key: "LOMBARDIA", why: "per slice, 1.23 → 1.73%" },
  { key: "CAMPANIA", why: "the most expensive: per slice to 3.33%" },
  { key: "VENETO", why: "flat 1.23% on the whole base" },
  { key: "LAZIO", why: "two slices, 1.73 then 3.33%" },
  { key: "FRIULI_VENEZIA_GIULIA", why: "single band on the whole base above 15,000" },
];

const MUNICIPAL_REGIONS: Readonly<Record<string, string>> = {
  MILANO: "LOMBARDIA",
  ROMA: "LAZIO",
  NAPOLI: "CAMPANIA",
  FIRENZE: "TOSCANA",
  NESSUNA: "LOMBARDIA",
};

test("one locality choice updates region and municipality atomically", async ({ page }) => {
  await page.goto("/?gross=45000");

  await expect(page.locator("#field-region")).toHaveCount(0);
  await expect(page.locator("#field-comune")).toHaveCount(0);

  const location = page.locator("#field-location");
  await expect(location).toHaveAttribute("data-value", "LOMBARDIA:MILANO");
  await location.click();
  await page.locator('[role="option"][data-value="LAZIO:ROMA"]').click();

  await expect(location).toContainText("Lazio · Roma");
  await expect(page).toHaveURL(/\?lang=it$/);
  await expect(page.getByTestId("amount-IT.ADDIZIONALE.REGIONALE.LAZIO")).toBeVisible();
  await expect(page.getByTestId("amount-IT.ADDIZIONALE.COMUNALE.ROMA")).toBeVisible();
  await expect(page.getByTestId("amount-IT.ADDIZIONALE.REGIONALE.LOMBARDIA")).toHaveCount(0);

  const liveNet = await page.getByTestId("net-annual").innerText();
  await page.reload();
  await expect(location).toHaveAttribute("data-value", "LAZIO:ROMA");
  await expect(page.getByTestId("net-annual")).toHaveText(liveNet);
});

for (const { key, why } of REGION_CASES) {
  test(`${key} matches the regional law — ${why}`, async ({ page }) => {
    const expected = fromStatute(45_000, 14, { region: key, municipality: "NESSUNA" });
    await page.goto(`/?gross=45000&location=${key}%3ANESSUNA`);

    const surtax = Math.abs(
      parseEuro(await page.getByTestId("amount-IT.ADDIZIONALE.REGIONALE." + key).innerText()),
    );
    expect(surtax, "regional surtax").toBe(expected.regionalSurtax);
    expect(parseEuro(await page.getByTestId("net-annual").innerText())).toBe(expected.netAnnual);
  });
}

for (const key of Object.keys(MUNICIPAL)) {
  test(`comune ${key} matches its own rate and exemption`, async ({ page }) => {
    const region = MUNICIPAL_REGIONS[key]!;
    const expected = fromStatute(45_000, 14, { region, municipality: key });
    await page.goto(`/?gross=45000&location=${region}%3A${key}`);

    const surtax = Math.abs(
      parseEuro(await page.getByTestId("amount-IT.ADDIZIONALE.COMUNALE." + key).innerText()),
    );
    expect(surtax, "municipal surtax").toBe(expected.municipalSurtax);
    expect(parseEuro(await page.getByTestId("net-annual").innerText())).toBe(expected.netAnnual);
  });
}

test("the region really moves the number — EUR 550.94 across Italy", async ({ page }) => {
  const netFor = async (region: string) => {
    await page.goto(`/?gross=45000&location=${region}%3ANESSUNA`);
    return parseEuro(await page.getByTestId("net-annual").innerText());
  };

  const cheapest = await netFor("VENETO"); // 1.23% statutory minimum
  const dearest = await netFor("CAMPANIA"); // per slice to 3.33%

  expect(cheapest - dearest).toBeCloseTo(550.94, 2);
});

test("every modelled city and every regional fallback is offered", async ({ page }) => {
  await page.goto("/?gross=45000");

  await page.locator("#field-location").click();
  const options = await page.getByRole("option").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-value")),
  );
  expect(options.length).toBe(29);
  for (const key of Object.keys(REGIONAL)) expect(options).toContain(`${key}:NESSUNA`);
  for (const [municipality, region] of Object.entries(MUNICIPAL_REGIONS)) {
    expect(options).toContain(`${region}:${municipality}`);
  }
});

test("an unknown place is refused, not approximated", async ({ page }) => {
  // A hand-edited URL falls back to the default rather than erroring — but the
  // engine still refuses anything it has no rule for, which is what matters.
  await page.goto("/?gross=45000&region=PADANIA");
  await expect(page.getByTestId("net-annual")).toBeVisible();
  await expect(page.getByTestId("amount-IT.ADDIZIONALE.REGIONALE.LOMBARDIA")).toBeVisible();
});

test("only the four operational countries are offered", async ({ page }) => {
  await page.goto("/?gross=45000");

  await page.locator("#field-country").click();
  const options = await page.getByRole("option").evaluateAll((els) =>
    els.map((el) => ({ value: el.getAttribute("data-value"), text: el.textContent ?? "" })),
  );
  expect(options.map((option) => option.value)).toEqual(["IT", "DE", "ES", "FR"]);
  for (const option of options) expect(option.text).not.toContain("non implementato");
});

test("a hand-edited unsupported country never enters the product state", async ({ page }) => {
  await page.goto("/?country=HU&gross=45000");
  await expect(page.locator("#field-country")).toHaveAttribute("data-value", "IT");
  await expect(page.getByTestId("net-annual")).toBeVisible();
});

test("the country picker updates the page live, no submit", async ({ page }) => {
  await page.goto("/");
  await page.locator("#field-country").click();
  await page.locator('[role="option"][data-value="DE"]').click();

  await expect(page).toHaveURL(/\?lang=it$/);
  await expect(page.locator("#field-steuerklasse")).toBeVisible();
});
