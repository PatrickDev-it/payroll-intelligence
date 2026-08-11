import { registerAdapter } from "@engine/adapter/registry.ts";
import { frenchAdapter } from "./adapter.ts";
import { loadFrenchRules } from "./rules/index.ts";

export function registerFrance(): void {
  registerAdapter(frenchAdapter, loadFrenchRules);
}

export { frenchAdapter } from "./adapter.ts";
export { FR_BOUNDARIES, FR_FIXTURES, referenceProfile } from "./fixtures.ts";
export { SUPPORTED_TAX_YEARS, loadFrenchRules } from "./rules/index.ts";
