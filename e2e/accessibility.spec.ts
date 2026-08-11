import { expect, test } from "@playwright/test";

/**
 * Accessibility as assertions rather than as a claim in a README.
 *
 * The bar is WCAG AA and, more concretely: the whole calculator has to be
 * operable with a keyboard alone, every control has to say what it is, and the
 * chart has to be readable with colour perception removed entirely.
 */

const URL = "/?gross=45000&periods=14";

test("every control announces itself: label, description, and errors", async ({ page }) => {
  await page.goto(URL);

  const problems = await page.evaluate(() => {
    const found: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-control]")) {
      const id = el.id;
      if (!id) {
        found.push(`${el.tagName} without id`);
        continue;
      }
      if (!document.querySelector(`label[for="${id}"]`)) found.push(`${id}: no <label for>`);

      // Every aria-describedby must point at something that exists, or the
      // description is silently dropped by the screen reader.
      for (const ref of (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean)) {
        if (!document.getElementById(ref)) found.push(`${id}: describedby → missing #${ref}`);
      }
    }
    return found;
  });

  expect(problems).toEqual([]);
});

test("the salary field carries numeric semantics even though it is a text input", async ({
  page,
}) => {
  await page.goto(URL);
  const gross = page.locator("#field-gross");

  // It is `type="text"` so it can group thousands; ARIA has to say what the
  // type no longer does.
  await expect(gross).toHaveAttribute("role", "spinbutton");
  await expect(gross).toHaveAttribute("aria-valuenow", "45000");
  await expect(gross).toHaveAttribute("inputmode", "numeric");

  // And it behaves like a number field for the keys people expect.
  await gross.focus();
  await page.keyboard.press("ArrowUp");
  await expect(gross).toHaveValue("46.000");
});

test("the calculator is operable from the keyboard alone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard traversal is a desktop concern");
  await page.goto(URL);

  // Tab through the complete parameter rail. If any custom control were
  // unreachable, the language selector at the far end could never receive
  // focus without a pointer.
  await page.locator("#field-country").focus();
  let reached = false;
  for (let i = 0; i < 40 && !reached; i += 1) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.id === "field-language");
  }
  expect(reached, "the language selector is reachable by Tab").toBe(true);

  // The last custom select is itself fully operable from the keyboard.
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="select-content"]')).toBeVisible();
  await page.keyboard.press("Escape");
});

test("a breakdown row opens from the keyboard and announces its state", async ({ page }) => {
  await page.goto(URL);

  const row = page.getByTestId("line-IT.IRPEF");
  const summary = row.locator(":scope > summary");

  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(row).toHaveAttribute("open", "");
  // <details> is what gives this for free — a div with onClick would not.
  await expect(row).toContainText("Norma applicata");
});

test("field information is a modal dialog that closes cleanly", async ({ page }) => {
  await page.goto(URL);

  const trigger = page.getByRole("button", { name: "Informazioni su Livello" });
  const dialog = page.getByRole("dialog", { name: "Livello" });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Cosa cambia");
  await expect(dialog).toContainText("Esempio");
  await expect(dialog).toContainText("Fonte");
  await expect(dialog).toContainText("873,22 €");
  await expect(dialog.getByRole("link", { name: /Metodologia e fonti/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  const panel = await dialog.locator("[role=document]").boundingBox();
  expect(panel).not.toBeNull();
  await page.mouse.click(Math.max(2, panel!.x - 8), Math.max(2, panel!.y - 8));
  await expect(dialog).not.toBeVisible();
});

test("the cost chart is readable without colour", async ({ page }) => {
  await page.goto(URL);

  // The bar itself is an image with a label that spells out every share…
  const bar = page.locator("[role=img][aria-label*='Ripartizione del costo aziendale']");
  await expect(bar).toHaveCount(1);
  await expect(bar).toHaveAttribute("aria-label", /Netto al dipendente \d+,\d%/);

  // …and the legend repeats each share as text, so the colours carry no
  // information that is not also written down.
  const legend = page.getByTestId("net-hero").locator("ul li");
  expect(await legend.count()).toBeGreaterThanOrEqual(3);
  await expect(legend.first()).toContainText("%");
});

test("headings descend without skipping a level", async ({ page }) => {
  await page.goto(URL);

  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3, h4")].map((el) => Number(el.tagName[1])),
  );

  expect(levels[0], "the page starts at h1").toBe(1);
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i]! - levels[i - 1]!, `h${levels[i - 1]} → h${levels[i]}`).toBeLessThanOrEqual(1);
  }
});

test("every live calculation is announced without a submit action", async ({ page }) => {
  await page.goto(URL);

  const live = page.getByRole("status");
  await expect(live).toHaveCount(1);
  await expect(page.getByTestId("calculate")).toHaveCount(0);
  await expect(live).toContainText("30.034,41 €");

  await page.locator("#field-gross").fill("30000");
  await expect(live).toContainText("23.425,12 €");

  await page.locator("#field-gross").fill("");
  await expect(live).toHaveText("Nessun risultato: controlla i dati inseriti.");
});

/**
 * Contrast, measured rather than asserted.
 *
 * This found a real defect the first time it ran: `--ink-subtle` was #9c968d,
 * which is 2.93:1 on white, and it carried most of the interface's helper text.
 * Both greys were re-derived so that they clear 4.5:1 on EVERY surface they are
 * painted on — white, sunken and canvas — and this test is what stops the next
 * palette tweak from quietly undoing that.
 *
 * It also explains one design rule: no alpha-blended background sits behind
 * text. `bg-accent-soft/50` cannot be checked without resolving the blend, and
 * a contrast you cannot compute is one you are not enforcing.
 */
for (const scheme of ["light", "dark"] as const) {
  test(`every text node clears WCAG AA in ${scheme} mode`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one pass per scheme is enough");
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(URL);

    const failures = await page.evaluate(() => {
      const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      const luminance = (rgb: number[]) => {
        const [r = 0, g = 0, b = 0] = rgb.map((v) => channel(v / 255));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const backgroundOf = (el: Element): number[] => {
        let node: Element | null = el;
        while (node) {
          const colour = getComputedStyle(node).backgroundColor;
          if (colour && !colour.includes("rgba(0, 0, 0, 0)")) return parse(colour);
          node = node.parentElement;
        }
        return [255, 255, 255];
      };

      const out: string[] = [];
      const selector = "p,span,dt,dd,li,label,h1,h2,h3,a,button,code,legend,summary";
      for (const el of document.querySelectorAll(selector)) {
        const own = [...el.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim() ?? "")
          .join("");
        if (!own) continue;

        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        if (Number(style.opacity) === 0) continue;

        const size = Number.parseFloat(style.fontSize);
        const weight = Number(style.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);

        const a = luminance(parse(style.color));
        const b = luminance(backgroundOf(el));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const floor = large ? 3 : 4.5;
        if (ratio < floor) out.push(`${ratio.toFixed(2)} < ${floor} — "${own.slice(0, 40)}"`);
      }
      return out;
    });

    expect(failures).toEqual([]);
  });
}
