import { expect, test, type Locator } from "@playwright/test";
import { collectLayoutFacts, overflowingElements, tinyText } from "../src/lib/layout-checks";
import { open } from "./helpers";
import { routes } from "./routes";

type Measured = { label: string; box: { x: number; y: number; width: number; height: number } | null };

/** Bounding boxes of the visible matches. A visible element with no box is still reported. */
async function measureVisible(locator: Locator): Promise<Measured[]> {
  const items = await locator.filter({ visible: true }).all();
  return Promise.all(
    items.map(async (item) => ({
      label: (await item.getAttribute("aria-label")) ?? (await item.innerText()).trim(),
      box: await item.boundingBox(),
    })),
  );
}

for (const route of routes) {
  test(`layout holds on ${route.path}`, async ({ page }) => {
    await open(page, route);
    const facts = await page.evaluate(collectLayoutFacts);
    const viewportWidth = page.viewportSize()!.width;

    // 1. No horizontal overflow, measured three ways so overflow-x: hidden on the
    //    root cannot hide it. 1px of slack for sub-pixel rounding.
    expect.soft(facts.innerWidth, "layout viewport widened past the device width").toBeLessThanOrEqual(viewportWidth + 1);
    expect.soft(facts.scrollWidth, "document scrolls horizontally").toBeLessThanOrEqual(facts.clientWidth + 1);
    expect
      .soft(overflowingElements(facts).map((e) => `${e.description} right=${e.rect.right}`), "elements past the viewport edge")
      .toEqual([]);

    // 2. Site chrome tap targets: things we control, not inline prose links (axe covers those).
    const header = await measureVisible(page.locator("header a, header button"));
    const footer = await measureVisible(page.locator("footer a"));
    const small = [...header, ...footer]
      .filter((m) => !m.box || m.box.width < 24 || m.box.height < 24)
      .map((m) => `${m.label}: ${m.box ? `${m.box.width}x${m.box.height}` : "no box"}`);
    expect.soft(small, "site chrome targets under 24px").toEqual([]);

    // 3. Header present and on one row.
    const centres = header.filter((m) => m.box).map((m) => m.box!.y + m.box!.height / 2);
    expect.soft(centres.length, "no visible header items found").toBeGreaterThan(0);
    if (centres.length > 0) {
      const spread = Math.max(...centres) - Math.min(...centres);
      expect
        .soft(spread, `header wraps onto more than one row (centres: ${header.map((m, i) => `${m.label}=${centres[i]?.toFixed(1)}`).join(", ")})`)
        .toBeLessThanOrEqual(2);
    }

    // 4. Readable text.
    expect
      .soft(tinyText(facts).map((e) => `${e.description} ${e.fontSize}px`), "text under 12px")
      .toEqual([]);
  });
}
