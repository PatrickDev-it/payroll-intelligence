import { registerAdapter } from "@engine/adapter/registry.ts";
import { italianAdapter } from "./adapter.ts";
import { loadItalianRules } from "./rules/index.ts";

export function registerItaly(): void {
  registerAdapter(italianAdapter, loadItalianRules);
}

export { italianAdapter } from "./adapter.ts";
export { IT_BOUNDARIES, IT_FIXTURES, referenceProfile } from "./fixtures.ts";
export type { Fixture } from "./fixtures.ts";
export { SUPPORTED_TAX_YEARS, loadItalianRules } from "./rules/index.ts";
