/**
 * The architectural boundary, enforced rather than intended.
 *
 * `src/engine/` must stay framework-agnostic: it runs inside Next.js today and
 * must move to a worker, a Fastify service or another repository without a
 * single formula changing. That property decays the first time someone imports
 * a React hook for convenience, and it decays silently — everything still
 * compiles. So it is a test.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ENGINE_DIR = fileURLToPath(new URL(".", import.meta.url));

/** Anything that would tie the engine to a runtime, a framework or the UI. */
const FORBIDDEN = [
  /from\s+["']react["']/,
  /from\s+["']react-dom/,
  /from\s+["']next[/"']/,
  /from\s+["'].*\/app\//,
  /from\s+["']@countries\//,
  /from\s+["']\.\.\/\.\.\/countries\//,
];

function typescriptFilesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return typescriptFilesIn(full);
    return entry.endsWith(".ts") ? [full] : [];
  });
}

describe("engine boundary", () => {
  const files = typescriptFilesIn(ENGINE_DIR);

  it("finds the engine sources", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("imports no framework, no UI and no country package", () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (pattern.test(source)) {
          violations.push(`${file.slice(ENGINE_DIR.length)} matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("depends on the engine only, so it stays extractable", () => {
    // The one direction that is allowed: countries import the engine, never the
    // reverse. Adapters register themselves into it at startup.
    const registry = readFileSync(join(ENGINE_DIR, "adapter", "registry.ts"), "utf8");
    expect(registry).not.toMatch(/italianAdapter/);
  });
});
