import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { open } from "./helpers";
import { routes } from "./routes";

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    for (const route of routes) {
      test(`axe passes on ${route.path}`, async ({ page }) => {
        await open(page, route);

        // next-themes applies the system preference as a class. Prove the theme we
        // asked for is the one on the page, or the dark run silently tests light.
        const html = page.locator("html");
        if (theme === "dark") await expect(html).toHaveClass(/\bdark\b/);
        else await expect(html).not.toHaveClass(/\bdark\b/);

        // No tag filter: best-practice rules such as heading-order must run too.
        const results = await new AxeBuilder({ page })
          .options({ rules: { "target-size": { enabled: true } } })
          .analyze();
        const violations = results.violations.map(
          (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
        expect(violations).toEqual([]);
      });
    }
  });
}
