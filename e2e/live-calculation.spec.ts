import { expect, test, type Page } from "@playwright/test";

const COUNTRIES = ["IT", "DE", "ES", "FR"] as const;

const REQUIRED_PROFILE_QUERY = {
  IT: "",
  DE: "&size=31",
  ES: "&aeatWithholdingRate=21.05",
  FR: "&pasRatePercent=8.2",
} as const;

type ProjectionSnapshot = {
  status: string;
  netPerPeriod: string | null;
  netAnnual: string | null;
  employerCost: string | null;
  empty: string | null;
};

/**
 * Every parameter has one authoritative real-time path: change the control,
 * read the live projection, then reload the privacy-safe tab session and compare
 * it. Each country owns an independent test budget so a slow two-core runner
 * cannot turn the complete four-country pass into one nondeterministic timeout.
 */
for (const country of COUNTRIES) {
  test(`${country}: every parameter recalculates live with no submit action`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one exhaustive interaction pass is sufficient");

    const baseUrl = `/?country=${country}&gross=45000${REQUIRED_PROFILE_QUERY[country]}`;
    await page.goto(baseUrl);

    const fieldIds = await page.locator("[data-control]").evaluateAll((controls) =>
      controls
        .map((control) => control.id)
        .filter((id) => id !== "field-country" && id !== "field-language"),
    );

    for (const id of fieldIds) {
      await page.goto(baseUrl);
      await expect(page.getByTestId("calculate")).toHaveCount(0);
      const control = page.locator(`#${id}`);
      const tagName = await control.evaluate((element) => element.tagName);
      let expectedPersisted: string;

      if (tagName === "BUTTON") {
        const current = await control.getAttribute("data-value");
        await control.click();
        const options = page.locator('[data-slot="select-item"]:not([data-disabled])');
        const values = await options.evaluateAll((items) =>
          items.map((item) => item.getAttribute("data-value")).filter(Boolean),
        );
        const next = values.find((value) => value !== current);
        expect(next, `${country}/${id}: alternative option`).toBeTruthy();
        await page.locator(`[data-slot="select-item"][data-value="${next}"]`).click();
        await expect(control).toHaveAttribute("data-value", next!);
        expectedPersisted = next!;
      } else {
        const current = await control.inputValue();
        const next = id === "field-gross" ? "50000" : current === "" ? "1" : String(Number(current) + 1);
        await control.fill(next);
        await expect(control).toHaveValue(id === "field-gross" ? "50.000" : next);
        expectedPersisted = next;
      }

      await expect(page, `${country}/${id}: profile stays out of URL`).toHaveURL(/\?lang=it$/);
      await expect
        .poll(
          () =>
            page.evaluate(
              ({ key }) => {
                const stored = sessionStorage.getItem("payroll.profile.v1");
                return stored ? (JSON.parse(stored) as Record<string, string>)[key] : undefined;
              },
              { key: id.replace(/^field-/, "") },
            ),
          { message: `${country}/${id}: latest value reaches tab storage` },
        )
        .toBe(expectedPersisted);
      const live = await projectionSnapshot(page);
      await page.reload();
      await expect(page).toHaveURL(/\?lang=it$/);
      await expect
        .poll(() => projectionSnapshot(page), { message: `${country}/${id}: restored projection` })
        .toEqual(live);
    }
  });
}

test("legacy profile links are consumed once, then reduced to a privacy-safe URL", async ({ page }) => {
  await page.goto("/?country=DE&gross=50000&steuerklasse=III&size=31");
  await expect(page.locator("#field-country")).toHaveAttribute("data-value", "DE");
  await expect(page.locator("#field-gross")).toHaveValue("50.000");
  await expect(page).toHaveURL(/\?lang=it$/);

  const stored = await page.evaluate(() => sessionStorage.getItem("payroll.profile.v1"));
  expect(stored).toContain('"gross":"50000"');
  await page.reload();
  await expect(page.locator("#field-steuerklasse")).toHaveAttribute("data-value", "III");
});

test("the compact Italian controls and hybrid INAIL recalculate in real time", async ({ page }) => {
  await page.goto("/?country=IT&gross=45000");
  await expect(page).toHaveURL(/\?lang=it$/);
  await expect(page.getByTestId("calculate")).toHaveCount(0);

  const perPeriod = page.getByTestId("net-per-period");
  const employerCost = page.getByTestId("employer-cost");
  const initialPerPeriod = await perPeriod.innerText();

  await page.locator("#field-periods").click();
  await page.locator('[data-slot="select-item"][data-value="13"]').click();
  await expect(perPeriod).not.toHaveText(initialPerPeriod);

  await page.locator("#field-size").fill("2");
  await expect(page.locator("#field-size")).toHaveValue("2");
  await page.locator("#field-fisReducedRateEligible").click();
  await page.locator('[data-slot="select-item"][data-value="not_eligible"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = sessionStorage.getItem("payroll.profile.v1");
        return stored ? (JSON.parse(stored) as Record<string, string>)["size"] : undefined;
      }),
    )
    .toBe("2");

  const inailRate = page.locator("#field-inailRatePercent");
  await expect(inailRate).toHaveValue("0.4");
  const beforeRiskClass = await employerCost.innerText();
  await page.locator("#field-inail").click();
  await page.locator('[data-slot="select-item"][data-value="retail"]').click();
  await expect(inailRate).toHaveValue("1.5");
  await expect(employerCost).not.toHaveText(beforeRiskClass);

  const beforeExactRate = await employerCost.innerText();
  await inailRate.fill("1");
  await expect(employerCost).not.toHaveText(beforeExactRate);
});

async function projectionSnapshot(page: Page): Promise<ProjectionSnapshot> {
  const textOrNull = async (testId: string) => {
    const node = page.getByTestId(testId);
    return (await node.count()) > 0 ? await node.first().textContent() : null;
  };

  return {
    status: (await page.getByRole("status").textContent()) ?? "",
    netPerPeriod: await textOrNull("net-per-period"),
    netAnnual: await textOrNull("net-annual"),
    employerCost: await textOrNull("employer-cost"),
    empty: await textOrNull("empty-result"),
  };
}
