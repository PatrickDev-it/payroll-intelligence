import { expect, test } from "@playwright/test";

const LOCALES = {
  it: { tag: "it-IT", net: "Netto per mensilità · 14 mensilità", breakdown: "Dal lordo al netto", employer: "Costo per l'azienda", rates: "Aliquote effettive", methodology: "Metodologia e perimetro del modello", country: "Paese", guide: "Guida al parametro" },
  en: { tag: "en-GB", net: "Net per payslip · 14 payments", breakdown: "From gross to net", employer: "Cost to the employer", rates: "Effective rates", methodology: "Methodology and model scope", country: "Country", guide: "Parameter guide" },
  de: { tag: "de-DE", net: "Netto je Abrechnung · 14 Zahlungen", breakdown: "Vom Brutto zum Netto", employer: "Kosten für den Arbeitgeber", rates: "Effektive Sätze", methodology: "Methodik und Modellumfang", country: "Land", guide: "Parameterhilfe" },
  fr: { tag: "fr-FR", net: "Net par paie · 14 versements", breakdown: "Du brut au net", employer: "Coût pour l’employeur", rates: "Taux effectifs", methodology: "Méthodologie et périmètre du modèle", country: "Pays", guide: "Guide du paramètre" },
  es: { tag: "es-ES", net: "Neto por paga · 14 pagas", breakdown: "Del bruto al neto", employer: "Coste para la empresa", rates: "Tipos efectivos", methodology: "Metodología y alcance del modelo", country: "País", guide: "Guía del parámetro" },
} as const;

test("all five locales translate the complete product surface and number formats", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  for (const [locale, copy] of Object.entries(LOCALES)) {
    await page.goto(`/?lang=${locale}&gross=45000&periods=14`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("#field-language")).toHaveAttribute("data-value", locale);
    await expect(page.getByTestId("calculate")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: copy.net })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: copy.breakdown })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: copy.employer })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: copy.rates })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: copy.methodology })).toBeVisible();

    const expectedMoney = new Intl.NumberFormat(copy.tag, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(2140.46);
    await expect(page.getByTestId("net-per-period")).toHaveText(expectedMoney);

    await page.locator("#field-language").click();
    const languageOptions = page.locator('[data-slot="select-item"]');
    await expect(languageOptions).toHaveCount(5);
    expect(await languageOptions.evaluateAll((options) => options.every((option) => option.getAttribute("data-disabled") === null))).toBe(true);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: new RegExp(copy.country) }).first().click();
    await expect(page.locator("dialog[open]").getByText(copy.guide, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Chiudi|Close|Schließen|Fermer|Cerrar/ }).click();
  }
});

test("every locale works with every country adapter without overflow or orphan labels", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  for (const locale of Object.keys(LOCALES)) {
    for (const country of ["IT", "DE", "ES", "FR"]) {
      await page.goto(`/?lang=${locale}&country=${country}&gross=45000`);
      const audit = await page.getByTestId("profile-form").evaluate((form) => ({
        lang: document.documentElement.lang,
        spills: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        unlabelled: [...form.querySelectorAll<HTMLElement>("[data-control]")].filter(
          (control) => !control.id || !form.querySelector(`label[for="${control.id}"]`),
        ).length,
        rows: new Set(
          [...form.querySelectorAll<HTMLElement>("[data-control]")]
            .filter((control) => control.id !== "field-inailRatePercent")
            .map((control) => {
              const measured = control.closest<HTMLElement>("[data-testid=inail-hybrid]") ?? control;
              return Math.round(measured.getBoundingClientRect().top);
            }),
        ).size,
        controls: [...form.querySelectorAll<HTMLElement>("[data-control]")].map((control) => ({
          id: control.id,
          top: Math.round(control.getBoundingClientRect().top),
          width: Math.round(control.getBoundingClientRect().width),
        })),
      }));
      expect(audit.lang).toBe(locale);
      expect(audit.spills, `${locale}/${country}: horizontal overflow`).toBe(false);
      expect(audit.unlabelled, `${locale}/${country}: controls without labels`).toBe(0);
      expect(audit.rows, `${locale}/${country}: ${JSON.stringify(audit.controls)}`).toBe(2);
    }
  }
});

test("changing language updates URL, document semantics and copy without navigation", async ({ page }) => {
  await page.goto("/?lang=it&gross=45000");
  await page.locator("#field-language").click();
  await page.locator('[data-slot="select-item"][data-value="de"]').click();

  await expect(page).toHaveURL(/lang=de/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByTestId("calculate")).toHaveCount(0);
  await expect(page.locator("label[for=field-gross]")).toContainText("Jahresbrutto");
});

test("server rendering preserves the requested language without JavaScript", async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/?lang=fr&gross=45000&periods=14");

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveTitle("Du brut au net");
  await expect(page.getByTestId("calculate")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Net par paie · 14 versements" })).toBeVisible();

  await context.close();
});
