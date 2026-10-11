/**
 * Layout measurements shared by the e2e suite and scripts/audit-responsive.ts.
 *
 * Two halves with a hard boundary. `collectLayoutFacts` runs inside the page via
 * page.evaluate, which serialises it with toString(), so it must be self-contained:
 * no imports, no helpers from this module, no other exports referenced. Everything
 * else here is a pure function over the facts it returns and runs in Node.
 */

export type ProfileOptions = {
  viewport: { width: number; height: number };
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
};

export type Profile = { name: string; options: ProfileOptions };

const touch = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** Device profiles. The iPhone 15 values match Playwright's descriptor minus its WebKit default. */
export const profiles: Profile[] = [
  { name: "phone-320", options: { viewport: { width: 320, height: 568 }, ...touch } },
  { name: "phone-375", options: { viewport: { width: 375, height: 667 }, ...touch } },
  { name: "iphone-15", options: { viewport: { width: 393, height: 659 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  { name: "tablet-768", options: { viewport: { width: 768, height: 1024 }, ...touch } },
  { name: "laptop-1024", options: { viewport: { width: 1024, height: 768 } } },
  { name: "desktop-1440", options: { viewport: { width: 1440, height: 900 } } },
];

export type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export type ElementFact = {
  index: number;
  /** tag, id, first three classes, first 40 characters of text. */
  description: string;
  rect: Rect;
  fontSize: number;
  /** Has a non-whitespace text node of its own. */
  hasOwnText: boolean;
  /** display is not none, visibility is not hidden, and the box is non-empty. */
  rendered: boolean;
  /** 1x1 or smaller: the sr-only pattern. */
  clipped: boolean;
  interactive: boolean;
  /**
   * Index of the nearest ancestor below body whose overflow-x is auto, scroll,
   * hidden or clip, or null. Content inside such an ancestor cannot widen the page.
   */
  containedBy: number | null;
};

export type LayoutFacts = {
  title: string;
  viewportMeta: string | null;
  innerWidth: number;
  innerHeight: number;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  elements: ElementFact[];
};

/** Browser side. Filled in by Task 3; this stub keeps the module compiling. */
export function collectLayoutFacts(): LayoutFacts {
  throw new Error("not implemented");
}

/** Rendered, uncontained elements past either viewport edge. */
export function overflowingElements(facts: LayoutFacts): ElementFact[] {
  return facts.elements.filter(
    (e) =>
      e.rendered &&
      e.containedBy === null &&
      (e.rect.right > facts.innerWidth + 1 || e.rect.left < -1),
  );
}

/** Rendered, unclipped interactive elements under `minimum` on either axis. */
export function smallTargets(facts: LayoutFacts, minimum = 24): ElementFact[] {
  return facts.elements.filter(
    (e) => e.interactive && e.rendered && !e.clipped && (e.rect.width < minimum || e.rect.height < minimum),
  );
}

/** Rendered, unclipped elements with their own text under `minimum` px. */
export function tinyText(facts: LayoutFacts, minimum = 12): ElementFact[] {
  return facts.elements.filter((e) => e.hasOwnText && e.rendered && !e.clipped && e.fontSize < minimum);
}
