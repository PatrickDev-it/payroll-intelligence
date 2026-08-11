import { expect, test } from "@playwright/test";

/**
 * "Responsive" is a claim, so it gets checked at the sizes people actually
 * hold. Every test in this file runs under all three Playwright projects
 * (iPhone 13, iPad Mini, 1440px desktop) — see playwright.config.ts.
 */

const URL = "/?gross=45000&periods=14";

test("no element spills outside the viewport", async ({ page }) => {
  await page.goto(URL);

  const spills = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > width + 1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 90));
  });

  expect(spills).toEqual([]);
});

test("an open select remains collision-safe inside the viewport", async ({ page }) => {
  await page.goto(URL);
  await expect(page).toHaveURL(/\?lang=it$/);

  const trigger = page.locator("#field-location");
  await expect(trigger).toBeVisible();
  await trigger.click();

  const content = page.locator('[data-slot="select-content"]');
  await expect(content).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(29);

  const box = await content.boundingBox();
  const triggerBox = await trigger.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  // The open menu is the geometric continuation of its trigger: its outer
  // edges align, its text uses the same inset, and the grid rhythm separates
  // the two surfaces without making them look detached.
  expect(box!.x).toBeCloseTo(triggerBox!.x, 0);
  expect(box!.width).toBeCloseTo(triggerBox!.width, 0);

  const geometry = await page.evaluate(() => {
    const triggerElement = document.querySelector<HTMLElement>("#field-location");
    const contentElement = document.querySelector<HTMLElement>('[data-slot="select-content"]');
    const selectedValue = triggerElement?.querySelector<HTMLElement>(".select-value");
    const firstOptionValue = contentElement?.querySelector<HTMLElement>(".select-item-text");
    const form = document.querySelector<HTMLElement>('[data-testid="profile-form"]');
    if (!triggerElement || !contentElement || !selectedValue || !firstOptionValue || !form) {
      return null;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const side = contentElement.dataset.side;
    const gap =
      side === "top"
        ? triggerRect.top - contentRect.bottom
        : contentRect.top - triggerRect.bottom;

    return {
      gap,
      gridGap: Number.parseFloat(getComputedStyle(form).rowGap),
      optionInset: firstOptionValue.getBoundingClientRect().left - contentRect.left,
      triggerInset: selectedValue.getBoundingClientRect().left - triggerRect.left,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry!.gap).toBeCloseTo(geometry!.gridGap, 0);
  expect(geometry!.optionInset).toBeCloseTo(geometry!.triggerInset, 0);
});

test("the essential figures are visible without opening anything", async ({ page }) => {
  await page.goto(URL);

  for (const id of ["net-per-period", "net-annual", "gross", "withheld", "employer-cost", "tax-wedge"]) {
    await expect(page.getByTestId(id), id).toBeVisible();
  }

  await expect(page.getByTestId("methodology-link")).toBeVisible();
  await expect(page.getByTestId("net-hero").getByTestId("confidence-badge")).toHaveCount(0);
});

test("the form is usable: labelled controls and comfortable tap targets", async ({ page }) => {
  await page.goto(URL);

  const gross = page.locator("#field-gross");
  await expect(gross).toBeVisible();

  // Every control has a real <label for>, not a placeholder pretending to be one.
  const unlabelled = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-control]")].filter(
      (el) => !el.id || !document.querySelector(`label[for="${el.id}"]`),
    ).length,
  );
  expect(unlabelled, "controls without a <label for>").toBe(0);

  // 36px is the floor for a touch target that does not need aiming — the
  // sidebar trades a little of the usual 40px for density, deliberately.
  for (const control of [gross, page.locator("#field-periods")]) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(36);
  }

  // A compact trigger is not allowed to buy space by hiding its selected
  // value. This catches padding that consumes the entire language control and
  // custom-select regressions where the trigger renders an empty Value.
  await expect(page.locator("#field-country")).toContainText("Italia");
  await expect(page.locator("#field-location")).toContainText("Lombardia · Milano");
  await expect(page.locator("#field-language")).toContainText("IT");
});

test("floating labels bridge canvas and controls while chevrons mirror borders", async ({ page }) => {
  await page.goto(URL);

  const labels = page.getByTestId("profile-form").locator(".field-floating-label");
  const labelText = labels.locator(".field-label-text");
  expect(new Set(await labels.evaluateAll((items) => items.map((item) => getComputedStyle(item).opacity))))
    .toEqual(new Set(["1"]));
  expect(
    new Set(await labelText.evaluateAll((items) => items.map((item) => getComputedStyle(item).opacity))),
  ).toEqual(new Set(["0.77"]));
  const bodyBackground = await page.locator("body").evaluate((body) =>
    getComputedStyle(body).backgroundColor,
  );
  const controlBackground = await page.locator("#field-country").evaluate((control) =>
    getComputedStyle(control).backgroundColor,
  );
  const labelBackgrounds = await labels.evaluateAll((items) =>
    items.map((item) => getComputedStyle(item).backgroundImage),
  );
  expect(
    labelBackgrounds.every(
      (background) =>
        background.startsWith("linear-gradient(") &&
        background.includes(bodyBackground) &&
        background.includes(controlBackground),
    ),
  ).toBe(true);

  const country = page.locator("#field-country");
  const chevron = country.locator(".select-chevron");
  const colours = async () => ({
    border: await country.evaluate((control) => getComputedStyle(control).borderRightColor),
    chevron: await chevron.evaluate((icon) => getComputedStyle(icon).color),
  });

  const initialColours = await colours();
  expect(initialColours.chevron).toBe(initialColours.border);
  await country.hover();
  await expect.poll(async () => {
    const state = await colours();
    return state.chevron === state.border;
  }).toBe(true);
  await country.focus();
  await expect.poll(async () => {
    const state = await colours();
    return state.chevron === state.border;
  }).toBe(true);
});

test("the parameter rail shares the result grid and reflows by task order", async ({ page }, testInfo) => {
  await page.goto(URL);

  const form = await page.getByTestId("profile-form").boundingBox();
  const hero = await page.getByTestId("net-hero").boundingBox();
  expect(form).not.toBeNull();
  expect(hero).not.toBeNull();
  await expect(page.locator("label[for=field-size] .field-label-text")).toHaveText(
    "N. dipendenti",
  );
  await expect(page.locator("label[for=field-inail] .field-label-text")).toHaveText(
    "INAIL",
  );
  await expect(page.locator("label[for=field-inailRatePercent]")).toHaveText("INAIL %");
  const inailHybrid = page.getByTestId("inail-hybrid");
  const inailType = page.locator("#field-inail");
  const inailRate = page.locator("#field-inailRatePercent");
  await expect(inailHybrid).toBeVisible();
  await expect(inailHybrid.getByText("/", { exact: true })).toBeVisible();
  await expect(inailRate).toHaveValue("0.4");
  const hybridGeometry = await Promise.all([
    inailHybrid.boundingBox(),
    inailType.boundingBox(),
    inailHybrid.getByText("/", { exact: true }).boundingBox(),
    inailRate.boundingBox(),
  ]);
  const [hybridBox, typeBox, slashBox, rateBox] = hybridGeometry;
  expect(typeBox!.y).toBeCloseTo(rateBox!.y, 0);
  expect(typeBox!.x).toBeGreaterThanOrEqual(hybridBox!.x);
  expect(typeBox!.x + typeBox!.width).toBeLessThanOrEqual(slashBox!.x);
  expect(slashBox!.x + slashBox!.width).toBeLessThanOrEqual(rateBox!.x);
  expect(rateBox!.x + rateBox!.width).toBeLessThanOrEqual(hybridBox!.x + hybridBox!.width);

  if (testInfo.project.name.startsWith("desktop")) {
    // The parameter rail and the answer belong to one visual column.
    expect(hero!.y).toBeGreaterThan(form!.y + form!.height - 1);
    expect(Math.abs(form!.x - hero!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(form!.width - hero!.width)).toBeLessThanOrEqual(1);

    const country = await page.locator("#field-country").boundingBox();
    const gross = await page.locator("#field-gross").boundingBox();
    const location = await page.locator("#field-location").boundingBox();
    const ccnl = await page.locator("#field-ccnl").boundingBox();
    const contract = await page.locator("#field-contract").boundingBox();
    const level = await page.locator("#field-level").boundingBox();
    const periods = await page.locator("#field-periods").boundingBox();
    const companySize = await page.locator("#field-size").boundingBox();
    const pensionCeiling = await page.locator("#field-pensionCeilingStatus").boundingBox();
    expect(form!.height).toBeLessThan(114);
    expect(country!.x).toBeCloseTo(gross!.x, 0);
    expect(country!.width).toBeCloseTo(gross!.width, 0);
    expect(country!.width).toBeLessThan(location!.width);
    expect(location!.x).toBeGreaterThan(country!.x);
    expect(contract!.x).toBeGreaterThan(location!.x);
    expect(country!.y).toBeCloseTo(location!.y, 0);
    expect(location!.y).toBeCloseTo(contract!.y, 0);
    expect(gross!.y).toBeCloseTo(ccnl!.y, 0);
    expect(ccnl!.y).toBeCloseTo(level!.y, 0);
    expect(level!.y).toBeCloseTo(periods!.y, 0);
    expect(gross!.x).toBeLessThan(ccnl!.x);
    expect(ccnl!.x).toBeLessThan(level!.x);
    expect(level!.x).toBeLessThan(periods!.x);
    expect(companySize!.x).toBeCloseTo(periods!.x, 0);
    expect(companySize!.width).toBeCloseTo(periods!.width, 0);
    expect(companySize!.y).toBeCloseTo(country!.y, 0);
    expect(pensionCeiling!.x).toBeCloseTo(hybridBox!.x, 0);
    expect(pensionCeiling!.width).toBeCloseTo(hybridBox!.width, 0);
    expect(pensionCeiling!.y).toBeCloseTo(country!.y, 0);
    expect(hybridBox!.y).toBeCloseTo(periods!.y, 0);
    expect(hybridBox!.x + hybridBox!.width).toBeCloseTo(form!.x + form!.width, 0);
    const formRows = new Set([location!.y, ccnl!.y]);
    expect(formRows.has(periods!.y)).toBe(true);
    expect(formRows.has(companySize!.y)).toBe(true);

    // The label cuts the top border, while its text starts on the exact same
    // 12px inset used by the selected value.
    const floatingLabel = await page.locator("label[for=field-country]").evaluate((label) => {
      const control = document.querySelector<HTMLElement>("#field-country")!;
      const labelRect = label.getBoundingClientRect();
      const textRect = label.querySelector<HTMLElement>(".field-label-text")!.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      return {
        labelTop: labelRect.top,
        labelBottom: labelRect.bottom,
        controlTop: controlRect.top,
        textInset: textRect.left - controlRect.left,
      };
    });
    expect(floatingLabel.labelTop).toBeLessThan(floatingLabel.controlTop);
    expect(floatingLabel.labelBottom).toBeGreaterThan(floatingLabel.controlTop);
    expect(floatingLabel.textInset).toBeCloseTo(12, 0);

    // Information is contextual: hidden at rest, revealed on hover immediately
    // to the left of the custom chevron.
    const countryField = page.locator(".parameter-country .field");
    const countryInfo = page.getByRole("button", { name: "Informazioni su Paese" });
    await expect(countryInfo).toHaveCSS("opacity", "0");
    await countryField.hover();
    await expect(countryInfo).toHaveCSS("opacity", "1");
    const infoBox = await countryInfo.boundingBox();
    const chevronBox = await countryField.locator(".select-chevron").boundingBox();
    const spacingAtom = await page.locator("html").evaluate((root) => {
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;width:var(--p);height:0";
      root.append(probe);
      const pixels = probe.getBoundingClientRect().width;
      probe.remove();
      return pixels;
    });
    expect(infoBox!.x + infoBox!.width).toBeLessThan(chevronBox!.x);
    expect(chevronBox!.x - (infoBox!.x + infoBox!.width)).toBeGreaterThanOrEqual(
      spacingAtom * 3,
    );

    // The compound INAIL field owns two inner values, but its help action
    // still belongs beside the select chevron — never at the left edge over
    // the selected risk class.
    const inailField = page.locator(".parameter-inail-hybrid .field");
    const inailInfo = inailField.locator(".field-help-trigger");
    const inailValue = inailField.locator(".select-value");
    const inailChevron = inailField.locator(".select-chevron");
    await inailField.hover();
    await expect(inailInfo).toHaveCSS("opacity", "1");
    const [inailInfoBox, inailValueBox, inailChevronBox] = await Promise.all([
      inailInfo.boundingBox(),
      inailValue.boundingBox(),
      inailChevron.boundingBox(),
    ]);
    const inailActionGap = inailChevronBox!.x - (inailInfoBox!.x + inailInfoBox!.width);
    expect(inailInfoBox!.x).toBeGreaterThan(inailValueBox!.x + inailValueBox!.width);
    expect(inailActionGap).toBeGreaterThanOrEqual(spacingAtom * 3);
    expect(inailActionGap).toBeLessThanOrEqual(spacingAtom * 5);

    // Roomier second row: visible labels must not be visually elided.
    const clippedLabels = await page
      .getByTestId("parameter-secondary")
      .locator(".field-floating-label")
      .evaluateAll(
        (labels) => labels.filter((label) => label.scrollWidth > label.clientWidth + 1).length,
      );
    expect(clippedLabels).toBe(0);

    // Every field, including the primary pair, fits exactly two control rows.
    const controls = await page
      .getByTestId("profile-form")
      .locator("[data-control]:not(#field-inailRatePercent)")
      .evaluateAll((controls) =>
        controls.map((control) => {
          const measured = control.closest("[data-testid=inail-hybrid]") ?? control;
          return {
            width: measured.getBoundingClientRect().width,
            top: Math.round(measured.getBoundingClientRect().top),
          };
        }),
      );
    // The 52px language selector is intentionally the narrowest control.
    expect(Math.min(...controls.map(({ width }) => width))).toBeGreaterThanOrEqual(52);
    expect(new Set(controls.map(({ top }) => top)).size).toBe(2);

    // The two rows are one composition, not two independent packing passes.
    // A wider lower control may span two upper tracks, but each of its edges
    // must still land on an axis established by the upper row.
    const rowEdges = await page
      .getByTestId("profile-form")
      .locator("[data-control]:not(#field-inailRatePercent)")
      .evaluateAll(
      (controls) => {
        const rows = new Map<number, Array<[number, number]>>();
        for (const control of controls) {
          const measured = control.closest("[data-testid=inail-hybrid]") ?? control;
          const rect = measured.getBoundingClientRect();
          const top = Math.round(rect.top);
          const row = rows.get(top) ?? [];
          row.push([Math.round(rect.left), Math.round(rect.right)]);
          rows.set(top, row);
        }
        return [...rows.values()].map((row) => row.sort((a, b) => a[0] - b[0]));
      },
    );
    expect(rowEdges).toHaveLength(2);
    const rowBoundaries = rowEdges.map((row) => new Set(row.flat()));
    expect(
      [...rowBoundaries[1]!].every((edge) => rowBoundaries[0]!.has(edge)),
    ).toBe(true);
  } else {
    // Compact task-order grid, without a desktop-style header box. Short
    // controls share a row so the live answer enters the first viewport.
    expect(hero!.y).toBeGreaterThan(form!.y + form!.height - 1);
    const country = await page.locator("#field-country").boundingBox();
    const gross = await page.locator("#field-gross").boundingBox();
    const periods = await page.locator("#field-periods").boundingBox();
    const companySize = await page.locator("#field-size").boundingBox();
    const controls = await page.getByTestId("profile-form").locator("[data-control]").evaluateAll(
      (items) => items.map((item) => ({ id: item.id, top: Math.round(item.getBoundingClientRect().top) })),
    );
    const net = await page.getByTestId("net-per-period").boundingBox();
    const viewport = page.viewportSize();
    expect(country!.y).toBeCloseTo(gross!.y, 0);
    expect(periods!.width).toBeLessThan(form!.width * 0.6);
    const controlsOnPeriodsRow = controls.filter(({ top }) => top === Math.round(periods!.y));
    expect(companySize!.y).toBeCloseTo(periods!.y, 0);
    expect(companySize!.width).toBeCloseTo(periods!.width, 0);
    expect(controlsOnPeriodsRow).toHaveLength(2);
    const compactLabelsClipped = await page
      .getByTestId("parameter-compact-row")
      .locator(".field-floating-label")
      .evaluateAll((labels) => labels.some((label) => label.scrollWidth > label.clientWidth + 1));
    expect(compactLabelsClipped).toBe(false);
    expect(form!.height).toBeLessThan(testInfo.project.name === "mobile" ? 500 : 300);
    expect(net!.y + net!.height).toBeLessThanOrEqual(viewport!.height);
  }
});

test("the page uses one measured rhythm from parameters through every result card", async ({ page }) => {
  await page.goto(URL);

  const rhythm = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("[data-testid=sidebar]")!;
    const headerFrame = header.firstElementChild as HTMLElement;
    const main = document.querySelector<HTMLElement>("[data-testid=content]")!;
    const resultStack = main.firstElementChild as HTMLElement;
    const parameterForm = document.querySelector<HTMLElement>("[data-testid=profile-form]")!;
    const cards = [...document.querySelectorAll<HTMLElement>(
      "[data-testid=net-hero], [data-testid=breakdown], [data-testid=rates], [data-testid=employer-section], [data-testid=methodology], [data-testid=provenance]",
    )];
    const gap = Number.parseFloat(getComputedStyle(resultStack).rowGap);
    const mainStyle = getComputedStyle(main);
    const headerRect = header.getBoundingClientRect();
    const firstRect = cards[0]!.getBoundingClientRect();
    const cardGaps = cards.slice(1).map((card, index) => {
      const previous = cards[index]!.getBoundingClientRect();
      return card.getBoundingClientRect().top - previous.bottom;
    });
    const frameRect = headerFrame.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    const headerTop = Number.parseFloat(getComputedStyle(headerFrame).paddingTop);
    const cardInsets = [...document.querySelectorAll<HTMLElement>(".card-header")].map((element) =>
      Number.parseFloat(getComputedStyle(element).paddingLeft),
    );

    return {
      gap,
      headerTop,
      mainTop: Number.parseFloat(mainStyle.paddingTop),
      mainBottom: Number.parseFloat(mainStyle.paddingBottom),
      headerToFirst: firstRect.top - headerRect.bottom,
      cardGaps,
      frameLeftDelta: Math.abs(frameRect.left - mainRect.left),
      frameRightDelta: Math.abs(frameRect.right - mainRect.right),
      cardInsets,
      parameterColumnGap: Number.parseFloat(getComputedStyle(parameterForm).columnGap),
      parameterRowGap: Number.parseFloat(getComputedStyle(parameterForm).rowGap),
    };
  });

  expect(rhythm.mainTop).toBeCloseTo(rhythm.gap, 1);
  expect(rhythm.mainBottom).toBeCloseTo(rhythm.gap, 1);
  expect(rhythm.headerTop).toBeCloseTo(rhythm.gap, 1);
  expect(rhythm.headerToFirst).toBeCloseTo(rhythm.gap, 1);
  expect(rhythm.cardGaps.every((gap) => Math.abs(gap - rhythm.gap) <= 1)).toBe(true);
  expect(rhythm.frameLeftDelta).toBeLessThanOrEqual(1);
  expect(rhythm.frameRightDelta).toBeLessThanOrEqual(1);
  expect(new Set(rhythm.cardInsets).size).toBe(1);
  expect(rhythm.parameterColumnGap).toBeCloseTo(rhythm.gap / 2, 1);
  expect(rhythm.parameterRowGap).toBeCloseTo(rhythm.gap / 2, 1);
});

test("language and theme form a fixed circular preference dock", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(URL);

  const dock = page.getByTestId("preference-dock");
  const language = page.locator("#field-language");
  const theme = page.locator("#field-theme");
  await expect(dock).toBeVisible();
  await expect(language).toHaveAccessibleName("Lingua dell'interfaccia");
  await expect(theme).toHaveAccessibleName("Passa al tema scuro");

  const geometry = await page.evaluate(() => {
    const dock = document.querySelector<HTMLElement>("[data-testid=preference-dock]")!;
    const language = document.querySelector<HTMLElement>("#field-language")!;
    const theme = document.querySelector<HTMLElement>("#field-theme")!;
    const viewport = { width: innerWidth, height: innerHeight };
    const dockBox = dock.getBoundingClientRect();
    const languageBox = language.getBoundingClientRect();
    const themeBox = theme.getBoundingClientRect();
    return {
      position: getComputedStyle(dock).position,
      bottom: viewport.height - dockBox.bottom,
      right: viewport.width - dockBox.right,
      spacing: Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>("[data-testid=content]")!).paddingTop,
      ),
      language: { width: languageBox.width, height: languageBox.height },
      theme: { width: themeBox.width, height: themeBox.height },
      vertical: themeBox.top > languageBox.bottom,
    };
  });
  expect(geometry.position).toBe("fixed");
  expect(geometry.bottom).toBeCloseTo(geometry.spacing, 0);
  expect(geometry.right).toBeCloseTo(geometry.spacing, 0);
  expect(geometry.language.width).toBeCloseTo(geometry.language.height, 0);
  expect(geometry.theme.width).toBeCloseTo(geometry.theme.height, 0);
  expect(geometry.theme.width).toBeCloseTo(geometry.language.width, 0);
  expect(geometry.vertical).toBe(true);

  const lightCanvas = await page.locator("body").evaluate((body) =>
    getComputedStyle(body).backgroundColor,
  );
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(theme).toHaveAccessibleName("Passa al tema chiaro");
  const darkCanvas = await page.locator("body").evaluate((body) =>
    getComputedStyle(body).backgroundColor,
  );
  expect(darkCanvas).not.toBe(lightCanvas);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("one --p token retunes both Tailwind and custom spacing", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  await page.goto(URL);

  const readSpacing = () =>
    page.evaluate(() => {
      const px = (element: Element, property: keyof CSSStyleDeclaration) =>
        Number.parseFloat(getComputedStyle(element)[property] as string);
      const form = document.querySelector<HTMLElement>("[data-testid=profile-form]")!;
      const headerInner = document.querySelector<HTMLElement>("[data-testid=sidebar] > div")!;
      const resultStack = document.querySelector<HTMLElement>("[data-testid=content] > div")!;
      const heroBody = document.querySelector<HTMLElement>("[data-testid=net-hero] > div")!;
      const hero = document.querySelector<HTMLElement>("[data-testid=net-hero]")!;
      const breakdown = document.querySelector<HTMLElement>("[data-testid=breakdown]")!;
      const header = document.querySelector<HTMLElement>("[data-testid=sidebar]")!;
      const cardHeader = breakdown.querySelector<HTMLElement>(":scope > header")!;
      const country = document.querySelector<HTMLElement>("#field-country")!;
      const countryLabelText = document.querySelector<HTMLElement>(
        "label[for=field-country] .field-label-text",
      )!;

      return {
        headerPadding: px(headerInner, "paddingLeft"),
        headerTop: px(headerInner, "paddingTop"),
        mainTopPadding: px(document.querySelector<HTMLElement>("[data-testid=content]")!, "paddingTop"),
        resultGap: px(resultStack, "rowGap"),
        heroGap: px(heroBody, "rowGap"),
        heroPadding: px(heroBody, "paddingLeft"),
        cardPadding: px(cardHeader, "paddingLeft"),
        headerToHero: hero.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
        heroToBreakdown: breakdown.getBoundingClientRect().top - hero.getBoundingClientRect().bottom,
        controlHeight: country.getBoundingClientRect().height,
        formGap: px(form, "columnGap"),
        formRowGap: px(form, "rowGap"),
        labelInset: countryLabelText.getBoundingClientRect().left - country.getBoundingClientRect().left,
      };
    });

  const before = await readSpacing();
  expect(before).toEqual({
    headerPadding: 32,
    headerTop: 32,
    mainTopPadding: 32,
    resultGap: 32,
    heroGap: 32,
    heroPadding: 40,
    cardPadding: 32,
    headerToHero: 32,
    heroToBreakdown: 32,
    controlHeight: 40,
    formGap: 16,
    formRowGap: 16,
    labelInset: 12,
  });

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        document.documentElement.style.setProperty("--p", "5px");
        requestAnimationFrame(() => resolve());
      }),
  );

  expect(await readSpacing()).toEqual({
    headerPadding: 40,
    headerTop: 40,
    mainTopPadding: 40,
    resultGap: 40,
    heroGap: 40,
    heroPadding: 50,
    cardPadding: 40,
    headerToHero: 40,
    heroToBreakdown: 40,
    controlHeight: 50,
    formGap: 20,
    formRowGap: 20,
    labelInset: 15,
  });
});

test("every supported country fits the same two-row floating-label grid", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  for (const country of ["IT", "DE", "ES", "FR"]) {
    await page.goto(`/?country=${country}`);
    const geometry = await page.getByTestId("profile-form").evaluate((form) => {
      const formRect = form.getBoundingClientRect();
      const controls = [...form.querySelectorAll<HTMLElement>(
        "[data-control]:not(#field-inailRatePercent)",
      )].map((control) => {
        const measured = control.closest("[data-testid=inail-hybrid]") ?? control;
        return {
          id: control.id,
          top: Math.round(measured.getBoundingClientRect().top),
          left: measured.getBoundingClientRect().left,
          right: measured.getBoundingClientRect().right,
        };
      });
      const labels = [...form.querySelectorAll<HTMLElement>(".field-floating-label")].map((label) => {
        const control = document.getElementById(label.getAttribute("for") ?? "");
        const labelRect = label.getBoundingClientRect();
        const controlRect = control?.getBoundingClientRect();
        return {
          crossesBorder: Boolean(controlRect && labelRect.top < controlRect.top && labelRect.bottom > controlRect.top),
          clipped: label.scrollWidth > label.clientWidth + 1,
        };
      });
      return { formHeight: formRect.height, formLeft: formRect.left, formRight: formRect.right, controls, labels };
    });

    expect(geometry.formHeight, `${country}: rail height`).toBeLessThan(114);
    expect(new Set(geometry.controls.map(({ top }) => top)).size, `${country}: control rows`).toBe(2);
    expect(geometry.controls.every(({ left, right }) => left >= geometry.formLeft - 1 && right <= geometry.formRight + 1)).toBe(true);
    expect(geometry.labels.every(({ crossesBorder }) => crossesBorder), `${country}: floating labels`).toBe(true);
    expect(geometry.labels.every(({ clipped }) => !clipped), `${country}: label clipping`).toBe(true);

    const rows = Map.groupBy(geometry.controls, ({ top }) => top);
    const rowValues = [...rows.values()].map((row) => row.toSorted((a, b) => a.left - b.left));
    expect(rowValues).toHaveLength(2);
    const [firstRow, secondRow] = rowValues as [typeof geometry.controls, typeof geometry.controls];
    const widerRow = firstRow.length <= secondRow.length ? firstRow : secondRow;
    const narrowerRow = firstRow.length <= secondRow.length ? secondRow : firstRow;
    const covered = new Set<string>();

    for (const wide of widerRow) {
      const nested = narrowerRow.filter(
        (control) => control.left >= wide.left - 1 && control.right <= wide.right + 1,
      );
      expect(nested.length, `${country}: unmatched control ${wide.id}`).toBeGreaterThanOrEqual(1);
      expect(nested.length, `${country}: more than one nested pair`).toBeLessThanOrEqual(2);
      expect(Math.abs(nested[0]!.left - wide.left), `${country}: left axis ${wide.id}`).toBeLessThanOrEqual(1);
      expect(
        Math.abs(nested.at(-1)!.right - wide.right),
        `${country}: right axis ${wide.id}`,
      ).toBeLessThanOrEqual(1);
      nested.forEach(({ id }) => covered.add(id));
    }

    expect(covered.size, `${country}: every lower cell belongs to a shared column`).toBe(
      narrowerRow.length,
    );
    if (geometry.controls.length % 2 === 1) {
      expect(
        widerRow.filter((wide) =>
          narrowerRow.filter(
            (control) => control.left >= wide.left - 1 && control.right <= wide.right + 1,
          ).length === 2,
        ),
        `${country}: one wide control owns the compact pair`,
      ).toHaveLength(1);
    } else {
      expect(widerRow).toHaveLength(narrowerRow.length);
    }
  }
});

test("every supported country keeps a compact rail and visible live preview", async ({ page }, testInfo) => {
  if (testInfo.project.name.startsWith("desktop")) return;

  const countries = [
    ["IT", ""],
    ["DE", ""],
    ["ES", "&aeatWithholdingRate=21.05"],
    ["FR", ""],
  ] as const;

  for (const [country, query] of countries) {
    await page.goto(`/?country=${country}&gross=45000${query}`);
    const geometry = await page.getByTestId("profile-form").evaluate((form) => {
      const formRect = form.getBoundingClientRect();
      const controls = [...form.querySelectorAll<HTMLElement>("[data-control]")].map((control) => {
        const rect = control.getBoundingClientRect();
        return { id: control.id, top: Math.round(rect.top), left: rect.left, right: rect.right };
      });
      return {
        height: formRect.height,
        left: formRect.left,
        right: formRect.right,
        controls,
      };
    });
    const countryBox = await page.locator("#field-country").boundingBox();
    const grossBox = await page.locator("#field-gross").boundingBox();
    const netBox = await page.getByTestId("net-per-period").boundingBox();
    const viewport = page.viewportSize();
    const rowSizes = Map.groupBy(geometry.controls, ({ top }) => top);

    expect(countryBox!.y, `${country}: country and salary start together`).toBeCloseTo(
      grossBox!.y,
      0,
    );
    expect(
      geometry.controls.every(
        ({ left, right }) => left >= geometry.left - 1 && right <= geometry.right + 1,
      ),
      `${country}: controls stay inside the rail`,
    ).toBe(true);
    expect(
      [...rowSizes.values()].some((row) => row.length > 1),
      `${country}: compact controls share a row`,
    ).toBe(true);
    expect(geometry.height, `${country}: compact rail height`).toBeLessThan(
      testInfo.project.name === "mobile" ? 500 : 300,
    );
    expect(
      netBox!.y + netBox!.height,
      `${country}: live preview in first viewport`,
    ).toBeLessThanOrEqual(viewport!.height);
  }
});

test("each desktop country follows its payroll task flow", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;

  const flows: Record<string, readonly [readonly string[], readonly string[]]> = {
    IT: [
      ["field-country", "field-location", "field-contract", "field-size", "field-pensionCeilingStatus"],
      ["field-gross", "field-ccnl", "field-level", "field-periods", "field-inail"],
    ],
    DE: [
      ["field-country", "field-region", "field-steuerklasse", "field-churchMember", "field-age", "field-children"],
      ["field-gross", "field-zusatzbeitrag", "field-zusatzbeitragRatePercent", "field-unfallRiskClass", "field-unfallRatePercent", "field-u2RatePercent"],
    ],
    ES: [
      ["field-country", "field-region", "field-contract", "field-cnaeRiskClass"],
      ["field-gross", "field-level", "field-periods", "field-aeatWithholdingRate", "field-atepRatePercent"],
    ],
    FR: [
      ["field-country", "field-region", "field-foyer", "field-children", "field-size"],
      ["field-gross", "field-statut", "field-versementMobilite", "field-versementMobiliteRatePercent", "field-atmpRiskClass", "field-atmpRatePercent"],
    ],
  };

  for (const [country, expected] of Object.entries(flows)) {
    await page.goto(`/?country=${country}`);
    const actual = await page
      .getByTestId("profile-form")
      .locator("[data-control]:not(#field-inailRatePercent)")
      .evaluateAll(
      (controls) => {
        const measuredRect = (control: Element) =>
          (control.closest("[data-testid=inail-hybrid]") ?? control).getBoundingClientRect();
        const rows = Map.groupBy(controls, (control) => Math.round(measuredRect(control).top));
        return [...rows.values()]
          .toSorted((a, b) => measuredRect(a[0]!).top - measuredRect(b[0]!).top)
          .map((row) =>
            row
              .toSorted((a, b) => measuredRect(a).left - measuredRect(b).left)
              .map(({ id }) => id),
          );
      },
    );

    expect(actual, `${country}: mental task order`).toEqual(expected);
  }
});

test("the visible result updates as you type without a calculate action", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\?lang=it$/);
  await expect(page.getByTestId("net-annual")).toHaveText("30.034,41 €");
  await expect(page.getByTestId("calculate")).toHaveCount(0);
  const preview = page.getByTestId("net-per-period");
  const previousPreview = await preview.innerText();

  if (testInfo.project.name !== "desktop") {
    const box = await preview.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }

  await page.locator("#field-gross").fill("30000");

  // No click, no Enter: the figure follows the keystroke while the sensitive
  // salary remains out of browser history and infrastructure URL logs.
  // A calculation that takes microseconds should not ask to be requested.
  await expect(page.getByTestId("net-annual")).toHaveText("23.425,12 €");
  await expect(preview).not.toHaveText(previousPreview);
  await expect(page).toHaveURL(/\?lang=it$/);
});

test("an empty salary shows an empty state, never a leftover figure", async ({ page }) => {
  await page.goto("/?gross=");

  await expect(page.getByTestId("empty-result")).toBeVisible();
  await expect(page.getByTestId("net-hero")).toHaveCount(0);
  // And the field says why, next to the field, not only in the results column.
  await expect(page.locator("#field-gross-error")).toBeVisible();
  await expect(page.locator("#field-gross")).toHaveAttribute("aria-invalid", "true");
});

test("text stays legible: no body copy below 11px", async ({ page }) => {
  await page.goto(URL);

  const tooSmall = await page.evaluate(() => {
    return [...document.querySelectorAll<HTMLElement>("p, li, span, td, label, dd, dt")]
      .filter((el) => el.textContent?.trim())
      .map((el) => Number.parseFloat(getComputedStyle(el).fontSize))
      .filter((size) => size > 0 && size < 11).length;
  });
  expect(tooSmall).toBe(0);
});

test("renders correctly in dark mode", async ({ browser, baseURL }, testInfo) => {
  test.skip(
    testInfo.project.name.includes("firefox"),
    "Playwright Firefox does not emulate prefers-color-scheme reliably",
  );
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(`${baseURL}${URL}`);

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const text = await page.evaluate(() => getComputedStyle(document.body).color);

  // Dark canvas, light ink — the tokens flipped rather than the page inverting.
  const luminance = (rgb: string) => {
    const [r = 0, g = 0, b = 0] = rgb.match(/\d+/g)?.map(Number) ?? [];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  expect(luminance(background)).toBeLessThan(60);
  expect(luminance(text)).toBeGreaterThan(180);
  await expect(page.getByTestId("net-annual")).toBeVisible();
  await context.close();
});

test("server rendering and native disclosures work with JavaScript disabled", async ({ browser }) => {
  // The core path is server-rendered on purpose. A payroll figure should not
  // depend on a bundle loading.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(URL);
  await expect(page.getByTestId("net-annual")).toHaveText("30.034,41 €");

  // <details> is native, so the derivation opens without a runtime too.
  // `:scope >` because the IRPEF row nests its own children, each a <details>.
  await page.getByTestId("line-IT.IRPEF").locator(":scope > summary").click();
  await expect(page.getByTestId("line-IT.IRPEF")).toContainText("art. 11 c. 4 TUIR");

  // The server still renders any addressable profile directly; the interactive
  // workflow intentionally belongs to the live client and has no submit step.
  await expect(page.getByTestId("calculate")).toHaveCount(0);
  await page.goto("/?gross=30000&periods=14");
  await expect(page.getByTestId("net-annual")).toHaveText("23.425,12 €");

  await context.close();
});
