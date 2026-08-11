import { expect, test } from "@playwright/test";

/**
 * One continuous page: profile, result and sources share the document scroll.
 * The header may stay visible, but no product region owns a second scrollbar.
 */

const URL = "/?gross=45000&periods=14";

test("production responses expose the enterprise security contract", async ({ page }) => {
  const response = await page.goto(URL);
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["cache-control"]).toContain("no-store");
  await expect(page.getByTestId("release-id")).toHaveText(/\S+/);
});

test("nothing spills or scrolls sideways", async ({ page }) => {
  await page.goto(URL);

  const state = await page.evaluate(() => ({
    documentOverflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.right > document.documentElement.clientWidth + 1;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 100)),
  }));

  expect(state.documentOverflow).toBeLessThanOrEqual(0);
  expect(state.offenders).toEqual([]);
});

test("opening a select never shifts the document or fixed preferences", async ({ page }) => {
  await page.goto(URL);

  const dock = page.getByTestId("preference-dock");
  const scrollbar = page.getByTestId("document-scrollbar");
  await expect(scrollbar).toHaveAttribute("data-visible", "true");
  const before = {
    dock: await dock.boundingBox(),
    clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
    innerWidth: await page.evaluate(() => window.innerWidth),
    thumb: await scrollbar.locator('[role="scrollbar"]').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        width: Number.parseFloat(style.width),
      };
    }),
  };

  await page.locator("#field-language").click();
  await expect(page.locator('[data-slot="select-content"]')).toBeVisible();

  const after = {
    dock: await dock.boundingBox(),
    clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
    bodyMarginRight: await page.evaluate(() => getComputedStyle(document.body).marginRight),
  };

  expect(before.clientWidth).toBe(before.innerWidth);
  expect(before.thumb.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(before.thumb.borderRadius).toBe("999px");
  expect(before.thumb.boxShadow).not.toBe("none");
  expect(before.thumb.width).toBeLessThanOrEqual(8);
  expect(after.clientWidth).toBe(before.clientWidth);
  expect(after.bodyMarginRight).toBe("0px");
  expect(after.dock?.x).toBeCloseTo(before.dock?.x ?? 0, 1);
  expect(after.dock?.y).toBeCloseTo(before.dock?.y ?? 0, 1);
  await expect(scrollbar).toHaveAttribute("data-visible", "true");
});

test("the overlay scrollbar controls the single document scroll", async ({ page }) => {
  await page.goto(URL);

  const scrollbar = page.getByTestId("document-scrollbar");
  await expect(scrollbar).toHaveAttribute("data-visible", "true");
  const thumb = scrollbar.locator('[role="scrollbar"]');

  await thumb.focus();
  await thumb.press("End");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect.poll(() => thumb.getAttribute("aria-valuenow")).not.toBe("0");

  await thumb.press("Home");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect.poll(() => thumb.getAttribute("aria-valuenow")).toBe("0");
});

test("the document is the only vertical scroller", async ({ page }) => {
  await page.goto(URL);

  const ownership = await page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>("[data-testid=sidebar]")!;
    const content = document.querySelector<HTMLElement>("[data-testid=content]")!;
    const scrollState = (element: HTMLElement) => {
      const overflow = getComputedStyle(element).overflowY;
      return {
        overflow,
        ownsScroll: /^(auto|scroll)$/.test(overflow) && element.scrollHeight > element.clientHeight,
      };
    };
    return {
      documentCanScroll:
        document.documentElement.scrollHeight > document.documentElement.clientHeight,
      sidebar: scrollState(sidebar),
      content: scrollState(content),
    };
  });

  expect(ownership).toEqual({
    documentCanScroll: true,
    sidebar: { overflow: "visible", ownsScroll: false },
    content: { overflow: "visible", ownsScroll: false },
  });
});

test("the parameter rail sticks only where it is a desktop status bar", async ({
  page,
}, testInfo) => {
  await page.goto(URL);

  const headerBefore = await page.locator("header").first().boundingBox();
  const formBefore = await page.getByTestId("profile-form").boundingBox();
  const heroBefore = await page.getByTestId("net-hero").boundingBox();

  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(100);

  const headerAfter = await page.locator("header").first().boundingBox();
  const formAfter = await page.getByTestId("profile-form").boundingBox();
  const heroAfter = await page.getByTestId("net-hero").boundingBox();

  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  if (testInfo.project.name.startsWith("desktop")) {
    expect(headerAfter?.y).toBe(headerBefore?.y);
    expect(formAfter?.y).toBe(formBefore?.y);
    const fade = await page.locator("header").first().evaluate((header) => {
      const style = getComputedStyle(header, "::after");
      return { background: style.backgroundImage, height: Number.parseFloat(style.height) };
    });
    expect(fade.background).toContain("linear-gradient");
    expect(fade.height).toBeGreaterThanOrEqual(24);
  } else {
    expect(headerAfter!.y).toBeLessThan(headerBefore!.y);
    expect(formAfter!.y).toBeLessThan(formBefore!.y);
  }
  expect(heroAfter!.y).toBeLessThan(heroBefore!.y);
});
