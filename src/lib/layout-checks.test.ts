import { describe, expect, it } from "vitest";
import {
  overflowingElements,
  profiles,
  smallTargets,
  tinyText,
  type ElementFact,
  type LayoutFacts,
} from "@/lib/layout-checks";

type Box = { left: number; top: number; width: number; height: number };
type Overrides = Partial<Omit<ElementFact, "rect">> & { index: number; rect?: Box };

/** An ElementFact with sensible defaults; `rect` takes a box and derives right and bottom. */
function element(overrides: Overrides): ElementFact {
  const { left = 0, top = 0, width = 100, height = 20 } = overrides.rect ?? {};
  return {
    description: `el${overrides.index}`,
    fontSize: 14,
    hasOwnText: false,
    rendered: true,
    clipped: false,
    interactive: false,
    containedBy: null,
    ...overrides,
    rect: { left, top, width, height, right: left + width, bottom: top + height },
  };
}

function facts(elements: ElementFact[], innerWidth = 320): LayoutFacts {
  return {
    title: "t",
    viewportMeta: "width=device-width, initial-scale=1",
    innerWidth,
    innerHeight: 568,
    scrollWidth: innerWidth,
    clientWidth: innerWidth,
    scrollHeight: 1000,
    elements,
  };
}

describe("profiles", () => {
  it("have unique names and positive viewports", () => {
    const names = profiles.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of profiles) {
      expect(p.options.viewport.width).toBeGreaterThan(0);
      expect(p.options.viewport.height).toBeGreaterThan(0);
    }
  });

  it("cover a 320px phone and a desktop", () => {
    const widths = profiles.map((p) => p.options.viewport.width);
    expect(Math.min(...widths)).toBe(320);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(1280);
  });
});

describe("overflowingElements", () => {
  it("flags elements past either edge, with 1px of slack", () => {
    const f = facts([
      element({ index: 0, rect: { left: 0, top: 0, width: 320, height: 10 } }),
      element({ index: 1, rect: { left: 0, top: 0, width: 321, height: 10 } }),
      element({ index: 2, rect: { left: 10, top: 0, width: 400, height: 10 } }),
      element({ index: 3, rect: { left: -5, top: 0, width: 50, height: 10 } }),
    ]);
    expect(overflowingElements(f).map((e) => e.index)).toEqual([2, 3]);
  });

  it("ignores contained and unrendered elements", () => {
    const f = facts([
      element({ index: 0, rect: { left: 0, top: 0, width: 320, height: 50 } }),
      element({ index: 1, containedBy: 0, rect: { left: 0, top: 0, width: 600, height: 10 } }),
      element({ index: 2, rendered: false, rect: { left: 0, top: 0, width: 600, height: 10 } }),
    ]);
    expect(overflowingElements(f)).toEqual([]);
  });
});

describe("smallTargets", () => {
  it("returns rendered, unclipped interactive elements under the minimum on either axis", () => {
    const f = facts([
      element({ index: 0, interactive: true, rect: { left: 0, top: 0, width: 50, height: 18 } }),
      element({ index: 1, interactive: true, rect: { left: 0, top: 0, width: 20, height: 44 } }),
      element({ index: 2, interactive: true, rect: { left: 0, top: 0, width: 44, height: 44 } }),
      element({ index: 3, interactive: true, clipped: true, rect: { left: 0, top: 0, width: 1, height: 1 } }),
      element({ index: 4, interactive: false, rect: { left: 0, top: 0, width: 5, height: 5 } }),
    ]);
    expect(smallTargets(f).map((e) => e.index)).toEqual([0, 1]);
    expect(smallTargets(f, 44).map((e) => e.index)).toEqual([0, 1]);
    expect(smallTargets(f, 18)).toEqual([]);
  });
});

describe("tinyText", () => {
  it("returns rendered, unclipped elements with their own text under 12px", () => {
    const f = facts([
      element({ index: 0, hasOwnText: true, fontSize: 11 }),
      element({ index: 1, hasOwnText: true, fontSize: 12 }),
      element({ index: 2, hasOwnText: false, fontSize: 8 }),
      element({ index: 3, hasOwnText: true, fontSize: 8, clipped: true }),
      element({ index: 4, hasOwnText: true, fontSize: 8, rendered: false }),
    ]);
    expect(tinyText(f).map((e) => e.index)).toEqual([0]);
  });
});
