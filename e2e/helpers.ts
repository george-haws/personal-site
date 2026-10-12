import { expect, type Page, type Response } from "@playwright/test";
import type { Route } from "./routes";

/**
 * Navigate to a route the way every spec does: wait for load and fonts (never
 * networkidle, which wrangler dev never reaches), and assert the expected status.
 */
export async function open(page: Page, route: Route): Promise<Response> {
  // Insurance for collectLayoutFacts, which must survive toString(): if a future
  // transform wraps nested functions in a __name helper, the page has one.
  await page.addInitScript("window.__name = window.__name ?? ((fn) => fn);");
  const response = await page.goto(route.path, { waitUntil: "load" });
  expect(response, `no response for ${route.path}`).not.toBeNull();
  expect(response!.status(), `status for ${route.path}`).toBe(route.expectedStatus);
  await page.evaluate(() => document.fonts.ready);
  return response!;
}
