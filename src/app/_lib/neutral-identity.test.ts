import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const GENERATED_OR_HISTORICAL = new Set([
  ".git",
  ".next",
  ".sinapsi",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const legacyIdentity = new RegExp(["jet", "hr"].join("[\\s_.-]*"), "i");

async function textFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => !GENERATED_OR_HISTORICAL.has(entry.name))
      .map(async (entry) => {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) return textFiles(absolute);
        return entry.isFile() ? [absolute] : [];
      }),
  );
  return files.flat();
}

describe("neutral product identity", () => {
  it("contains no legacy name in distributable paths or text", async () => {
    const root = process.cwd();
    const files = await textFiles(root);
    const matches: string[] = [];

    for (const file of files) {
      const relative = path.relative(root, file);
      if (legacyIdentity.test(relative)) {
        matches.push(relative);
        continue;
      }

      const contents = await readFile(file, "utf8");
      if (legacyIdentity.test(contents)) matches.push(relative);
    }

    expect(matches).toEqual([]);
  });
});
