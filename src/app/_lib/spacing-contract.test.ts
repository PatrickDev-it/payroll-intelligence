import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GLOBALS_PATH = join(APP_ROOT, "globals.css");

function componentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return componentFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("global spacing contract", () => {
  it("routes Tailwind's entire numeric scale through --p", () => {
    const css = readFileSync(GLOBALS_PATH, "utf8");

    expect(css).toMatch(/--p:\s*[^;]+;/);
    expect(css).toMatch(/--spacing:\s*var\(--p\);/);
    for (const role of [
      "space-hairline",
      "space-label",
      "space-related",
      "space-control",
      "space-content",
      "space-card",
      "space-section",
      "section-gap",
      "page-inline",
      "card-inline",
    ]) {
      expect(css, role).toMatch(new RegExp(`--${role}:\\s*var\\(--|--${role}:\\s*calc\\(var\\(--p\\)`));
    }
  });

  it("has no fixed positive CSS spacing outside --p", () => {
    const css = readFileSync(GLOBALS_PATH, "utf8");
    const spatialDeclaration =
      /^\s*(?:margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|gap|row-gap|column-gap|inset(?:-[a-z]+)?|top|right|bottom|left|scroll-margin(?:-[a-z]+)?)\s*:\s*([^;]+);/gm;
    const violations = [...css.matchAll(spatialDeclaration)]
      .filter((match) => {
        const value = match[1] ?? "";
        return /(?:\d*\.)?\d+(?:px|rem)\b/.test(value) && !value.includes("var(--p)");
      })
      .map((match) => match[0].trim());

    expect(violations).toEqual([]);
  });

  it("has no component-level fixed spacing or opaque numeric spatial utilities", () => {
    const fixedInlineSpacing =
      /(?:margin|padding|gap|inset|top|right|bottom|left|scrollMargin)[A-Za-z]*\s*:\s*[`'\"][^`'\"]*(?:\d*\.)?\d+(?:px|rem)\b/g;
    const arbitrarySpatialUtility =
      /(?:^|\s)(?:[a-z0-9-]+:)*(?:-?(?:m[trblxy]?|p[trblxy]?|gap[xy]?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|scroll-m[trblxy]?))-\[[^\]]*(?:px|rem)[^\]]*\]/g;
    const numericSpatialUtility =
      /(?:^|[\s"'`])(?:[a-z0-9-]+:)*-?(?:m[trblxy]?|p[trblxy]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|scroll-m[trblxy]?)-(?:0\.\d+|[1-9]\d*(?:\.\d+)?)(?=[\s"'`])/g;
    const violations = componentFiles(APP_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return [
        ...source.matchAll(fixedInlineSpacing),
        ...source.matchAll(arbitrarySpatialUtility),
        ...source.matchAll(numericSpatialUtility),
      ].map(
        (match) => `${path.replace(`${APP_ROOT}/`, "")}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });
});
