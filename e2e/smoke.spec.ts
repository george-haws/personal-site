import { expect, test } from "@playwright/test";
import { open } from "./helpers";
import { routes } from "./routes";

for (const route of routes) {
  test(`${route.path} responds with ${route.expectedStatus} and renders a heading`, async ({ page }) => {
    await open(page, route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
