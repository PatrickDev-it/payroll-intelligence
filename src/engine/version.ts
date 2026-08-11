/**
 * The engine's version, alone in a file so that anything under `pipeline/` can
 * stamp a result with it without importing `index.ts` and creating a cycle
 * (index re-exports the pipeline).
 */
export const ENGINE_VERSION = "0.3.0";
