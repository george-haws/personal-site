export type Route = { path: string; expectedStatus: number };

/** Next's error page. Anything with a segment starting with `_` is framework output, not a page. */
function isPage(file: string): boolean {
  if (!file.endsWith(".html") || file === "404.html") return false;
  return !file.split("/").some((segment) => segment.startsWith("_"));
}

/**
 * Turns the HTML files of a Next static export (paths relative to out/, forward
 * slashes) into the routes the e2e suite visits. Throws rather than returning an
 * empty list so a missing build fails loudly instead of generating zero tests.
 */
export function routesFromFiles(htmlFiles: string[]): Route[] {
  const pages = htmlFiles
    .filter(isPage)
    .map((file) => file.replace(/\.html$/, "").replace(/(^|\/)index$/, ""))
    .map((stem) => (stem === "" ? "/" : `/${stem}`))
    .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
    .map((path) => ({ path, expectedStatus: 200 }));
  if (pages.length === 0) {
    throw new Error("No pages found in the build output. Run `npm run build` first.");
  }
  return [...pages, { path: "/no-such-page", expectedStatus: 404 }];
}
