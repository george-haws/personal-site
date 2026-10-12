import { expect, test } from "@playwright/test";
import { projects } from "../src/data/projects";
import { open } from "./helpers";

// The demo overflows on phones and fits from the tablet profile up. There is no
// profile between 640 and 768, so one threshold separates the two expectations.
const phoneMaxWidth = 640;

const cases = [
  { path: "/", headingLevel: 3, project: projects.find((p) => p.featured && p.demo) },
  { path: "/projects", headingLevel: 2, project: projects.find((p) => p.demo) },
];

for (const { path, headingLevel, project } of cases) {
  test(`terminal demo is reachable and signals overflow on ${path}`, async ({ page }) => {
    test.skip(!project, "no project with a demo in src/data/projects.ts");
    await open(page, { path, expectedStatus: 200 });

    // Scope everything to this project's card so a second demo on the page can
    // never trip strict mode or get asserted by mistake.
    const heading = page.getByRole("heading", { level: headingLevel, name: project!.title });
    const card = page.locator('[data-slot="card"]').filter({ has: heading });
    const region = card.getByRole("region", { name: "Sample terminal output" });
    const fade = region.locator("..").locator('[data-slot="scroll-fade"]');

    await expect(heading).toBeVisible();
    await expect(region).toHaveAttribute("tabindex", "0");

    // Playwright's toBeHidden treats opacity 0 as visible, so read the attribute the
    // component maintains and the computed opacity. Both assertions poll.
    if (page.viewportSize()!.width < phoneMaxWidth) {
      await expect(region).toHaveAttribute("data-overflow", "true");
      await expect(fade).toHaveCSS("opacity", "1");
      await region.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await expect(region).toHaveAttribute("data-overflow", "false");
      await expect(fade).toHaveCSS("opacity", "0");
    } else {
      await expect(region).toHaveAttribute("data-overflow", "false");
      await expect(fade).toHaveCSS("opacity", "0");
    }
  });
}
