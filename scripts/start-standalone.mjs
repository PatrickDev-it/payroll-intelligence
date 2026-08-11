import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = resolve(projectRoot, ".next/standalone");
const staticSource = resolve(projectRoot, ".next/static");
const staticTarget = resolve(standaloneRoot, ".next/static");
const serverEntry = resolve(standaloneRoot, "server.js");

if (!existsSync(serverEntry) || !existsSync(staticSource)) {
  throw new Error("Standalone output is missing. Run `npm run build` first.");
}

mkdirSync(dirname(staticTarget), { recursive: true });
cpSync(staticSource, staticTarget, { recursive: true, force: true });

await import(pathToFileURL(serverEntry).href);
