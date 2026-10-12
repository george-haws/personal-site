import { readdirSync } from "node:fs";
import path from "node:path";
import { routesFromFiles, type Route } from "../src/lib/routes-from-build";

// Resolved from the working directory, like the audit script. Playwright runs from
// the repo root, where the config lives.
const outDir = path.resolve("out");

function htmlFilesUnder(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  } catch {
    throw new Error(`No build output at ${dir}. Run \`npm run build\` first.`);
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
}

/** Routes discovered from out/ when the Playwright config loads. */
export const routes: Route[] = routesFromFiles(htmlFilesUnder(outDir));
export type { Route };
