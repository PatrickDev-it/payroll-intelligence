import { expect, test } from "@playwright/test";

/**
 * Four countries, one form. What is asserted here is not the arithmetic — the
 * unit tests own that — but the promise the product makes: the form asks what
 * THIS country needs and nothing else, and every country reaches a net through
 * the same UI with no country-specific code path in front of it.
 */

const CASES = [
  {
    code: "IT",
    name: "Italia",
    /** Declared by this country and shown up front. */
    own: ["#field-ccnl", "#field-location"],
    /** Specialist parameter declared by this country and kept in the rail. */
    advanced: ["#field-inail"],
    /** Declared by another country: this one must NOT show it. */
    foreign: ["#field-steuerklasse", "#field-foyer"],
    line: "amount-IT.IRPEF",
    query: "",
  },
  {
    code: "DE",
    name: "Germania",
    own: ["#field-steuerklasse", "#field-churchMember"],
    advanced: ["#field-zusatzbeitrag"],
    foreign: ["#field-ccnl", "#field-location"],
    line: "amount-DE.LOHNSTEUER.TARIF",
    query: "",
  },
  {
    code: "ES",
    name: "Spagna",
    own: ["#field-region", "#field-periods", "#field-aeatWithholdingRate"],
    advanced: ["#field-level"],
    foreign: ["#field-steuerklasse", "#field-ccnl"],
    line: "amount-ES.IRPF.RETENCION",
    query: "&aeatWithholdingRate=21.05",
  },
  {
    code: "FR",
    name: "Francia",
    own: ["#field-foyer", "#field-statut"],
    advanced: ["#field-atmpRiskClass"],
    foreign: ["#field-ccnl", "#field-steuerklasse"],
    line: "amount-FR.IR",
    query: "",
  },
] as const;

for (const country of CASES) {
  test(`${country.name}: the form asks what this country needs, and produces a net`, async ({
    page,
  }) => {
    await page.goto(`/?country=${country.code}&gross=45000${country.query}`);

    for (const selector of country.own) await expect(page.locator(selector)).toBeVisible();
    for (const selector of country.foreign) await expect(page.locator(selector)).toHaveCount(0);

    // Specialist parameters stay visible too: the desktop rail uses two semantic
    // rows and compact viewports use a dense grid, with no disclosure to search through.
    for (const selector of country.advanced) {
      await expect(page.locator(selector)).toBeVisible();
    }

    await expect(page.getByTestId("net-annual")).toBeVisible();
    await expect(page.getByTestId(country.line)).toBeVisible();
    await expect(page.getByTestId("employer-cost")).toBeVisible();
    await expect(page.getByTestId("provenance")).toBeVisible();
  });
}

test("switching country replaces the whole input set, live", async ({ page }) => {
  await page.goto("/?gross=45000");
  await expect(page.locator("#field-ccnl")).toBeVisible();

  await page.locator("#field-country").click();
  await page.locator('[role="option"][data-value="DE"]').click();

  await expect(page.locator("#field-steuerklasse")).toBeVisible();
  await expect(page.locator("#field-ccnl")).toHaveCount(0);
  await expect(page).toHaveURL(/\?lang=it$/);
  await expect(page.getByTestId("net-annual")).toBeVisible();
  await page.reload();
  await expect(page.locator("#field-country")).toHaveAttribute("data-value", "DE");
  await expect(page.locator("#field-steuerklasse")).toBeVisible();
});

test("the German tax line shows the polynomial it came from, not a bracket", async ({ page }) => {
  await page.goto("/?country=DE&gross=45000");

  const row = page.getByTestId("line-DE.LOHNSTEUER.TARIF");
  await row.locator(":scope > summary").click();

  await expect(row).toContainText("32a");
  // The derivation is the statute's own polynomial, with the z it was evaluated at.
  await expect(row).toContainText("173,1");
  // And the notional base it was applied to is named, not hidden.
  await expect(row).toContainText("Vorsorgepauschale");
});

test("Spain shows both halves of its income tax, and names the community", async ({ page }) => {
  await page.goto("/?country=ES&gross=45000&region=CATALUNA&aeatWithholdingRate=21.05");

  const row = page.getByTestId("line-ES.IRPF.RETENCION");
  await row.locator(":scope > summary").click();

  const estimate = page.getByTestId("line-ES.IRPF.LIABILITY_ESTIMATE");
  await estimate.locator(":scope > summary").click();

  await expect(row).toContainText("estatal");
  await expect(row).toContainText("Cataluña");
  await expect(page.getByTestId("amount-ES.IRPF.ESCALA.ESTATAL")).toBeVisible();
  await expect(page.getByTestId("amount-ES.IRPF.ESCALA.AUTONOMICA.CATALUNA")).toBeVisible();
});
