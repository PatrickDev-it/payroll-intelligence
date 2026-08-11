import { registerAdapter } from "@engine/adapter/registry.ts";
import { spanishAdapter } from "./adapter.ts";
import { loadSpanishRules } from "./rules/index.ts";

export function registerSpain(): void {
  registerAdapter(spanishAdapter, loadSpanishRules);
}

export { spanishAdapter } from "./adapter.ts";
export { ES_BOUNDARIES, ES_FIXTURES, referenceProfile } from "./fixtures.ts";
export { SUPPORTED_TAX_YEARS, loadSpanishRules } from "./rules/index.ts";
