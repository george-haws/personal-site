import { describe, expect, it } from "vitest";
import { routesFromFiles } from "@/lib/routes-from-build";

describe("routesFromFiles", () => {
  it("maps built HTML files to routes and appends a known-missing route", () => {
    const routes = routesFromFiles([
      "index.html",
      "projects.html",
      "writing.html",
      "writing/fast-validation.html",
      "404.html",
      "_not-found.html",
      "_next/static/anything.html",
    ]);
    expect(routes).toEqual([
      { path: "/", expectedStatus: 200 },
      { path: "/projects", expectedStatus: 200 },
      { path: "/writing", expectedStatus: 200 },
      { path: "/writing/fast-validation", expectedStatus: 200 },
      { path: "/no-such-page", expectedStatus: 404 },
    ]);
  });

  it("treats nested index files as directory routes", () => {
    expect(routesFromFiles(["docs/index.html"])).toEqual([
      { path: "/docs", expectedStatus: 200 },
      { path: "/no-such-page", expectedStatus: 404 },
    ]);
  });

  it("throws when the build produced no pages", () => {
    expect(() => routesFromFiles([])).toThrow(/no pages/i);
    expect(() => routesFromFiles(["404.html", "_not-found.html"])).toThrow(/no pages/i);
  });
});
