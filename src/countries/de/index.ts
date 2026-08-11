import { registerAdapter } from "@engine/adapter/registry.ts";
import { germanAdapter } from "./adapter.ts";
import { loadGermanRules } from "./rules/index.ts";

export function registerGermany(): void {
  registerAdapter(germanAdapter, loadGermanRules);
}

export { germanAdapter } from "./adapter.ts";
export { DE_FIXTURES, DE_BOUNDARIES, referenceProfile } from "./fixtures.ts";
export { SUPPORTED_TAX_YEARS, loadGermanRules } from "./rules/index.ts";
