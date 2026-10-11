# Responsive E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Playwright Test suite that fails when a responsive or mobile regression lands on the built static site, runnable locally today and under GitHub Actions later with no config changes.

**Architecture:** A shared module `src/lib/layout-checks.ts` holds one self-contained browser function that gathers raw layout facts and a set of pure Node predicates that judge them. Playwright projects, one per device profile, run three spec files against `out/` served by `wrangler dev`; routes are discovered from the build output after `npm run build` has run. The existing audit script becomes a second consumer of the same module.

**Tech Stack:** Next.js 16 static export, `@playwright/test` 1.63.0 (replacing the direct `playwright-core` dependency), `@axe-core/playwright`, Vitest for the pure parts, `wrangler dev` as the server.

**Spec:** `docs/superpowers/specs/2026-10-11-responsive-e2e-suite-design.md`

## Global Constraints

- Node: run every command with `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` first. The homebrew `node` on PATH crashes at startup.
- `npm run check` and `npm test` must never launch a browser: Cloudflare's build runs them without one. Browser tests live only under `e2e/` and run via `npm run test:e2e`. Vitest's `include` is already `src/**/*.test.{ts,tsx}`, so `e2e/*.spec.ts` is never collected; do not widen it.
- `@playwright/test` is pinned to exactly `1.63.0`. No direct `playwright-core` dependency remains.
- `collectLayoutFacts` is serialised with `toString()` for `page.evaluate`. It must not reference anything outside its own body: no imports, no module-level helpers, no other exports.
- All navigations use `waitUntil: "load"` then await `document.fonts.ready`. Never `networkidle`.
- `CI` is read in exactly five places in `playwright.config.ts`: browser channel, retries, trace mode, `reuseExistingServer`, `forbidOnly`.
- Every scripted source edit in a verification step is followed by `git diff --quiet && { echo "edit did not apply"; exit 1; }` so a drifted string cannot turn into a silent no-op.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Pixel tolerances: 1px for overflow, scroll width, and viewport width; 2px for the header row.

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/layout-checks.ts` | Device profiles; `collectLayoutFacts` (browser); pure predicates over facts (Node) |
| `src/lib/layout-checks.test.ts` | Vitest: profiles well-formed, predicates classify fixtures correctly |
| `src/lib/routes-from-build.ts` | Pure mapping from built HTML file paths to routes with expected status |
| `src/lib/routes-from-build.test.ts` | Vitest for that mapping |
| `e2e/routes.ts` | Reads `out/`, applies the mapping, throws if nothing found |
| `e2e/helpers.ts` | `open(page, route)`: navigate, wait for fonts, assert status |
| `e2e/smoke.spec.ts` | Every route responds with its expected status and renders an `h1` |
| `e2e/layout.spec.ts` | One test per route: overflow, chrome tap targets, header row, tiny text |
| `e2e/a11y.spec.ts` | One test per route per theme: axe with `target-size`, no tag filter |
| `e2e/demo.spec.ts` | Terminal demo region: focusable, named, overflow and fade state, heading level |
| `playwright.config.ts` | Projects from profiles, Chrome channel locally, `wrangler dev` web server |
| `scripts/audit-responsive.ts` | Imports the shared module instead of its own copy |
| `scripts/build-resume.ts` | Imports `chromium` from `@playwright/test` |
| `src/components/ScrollRegion.tsx` | Gains `data-slot="scroll-fade"` on the fade so tests can locate it |
| `package.json`, `.gitignore`, `README.md` | Dependency swap, scripts, ignores, docs |

---

### Task 1: Swap `playwright-core` for a pinned `@playwright/test`

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `scripts/build-resume.ts:3`
- Modify: `scripts/audit-responsive.ts:3-5`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `@playwright/test@1.63.0` installed; `chromium`, `devices`, and `BrowserContextOptions` imported from `"@playwright/test"` everywhere.

- [ ] **Step 1: Install the pinned runner and remove the direct core dependency**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npm install --save-dev --save-exact @playwright/test@1.63.0
npm uninstall playwright-core
grep -n "playwright" package.json
```

Expected: `"@playwright/test": "1.63.0"` present, no `playwright-core` line. `@axe-core/playwright` still listed.

- [ ] **Step 2: Confirm `playwright-core` still resolves for `@axe-core/playwright`**

```bash
node -e "console.log(require.resolve('playwright-core/package.json'))"
node -e "const t=require('@playwright/test'); console.log(typeof t.chromium.launch, Object.keys(t.devices).length)"
```

Expected: a path under `node_modules/playwright-core`, then `function` and a number over 100.

- [ ] **Step 3: Repoint the two scripts**

In `scripts/build-resume.ts`, replace:

```ts
import { chromium } from "playwright-core";
```

with:

```ts
import { chromium } from "@playwright/test";
```

In `scripts/audit-responsive.ts`, replace:

```ts
import { chromium, devices, type BrowserContextOptions } from "playwright-core";
```

with:

```ts
import { chromium, devices, type BrowserContextOptions } from "@playwright/test";
```

- [ ] **Step 4: Ignore Playwright output folders**

Append to `.gitignore`:

```
# playwright
/test-results/
/playwright-report/
/blob-report/
```

- [ ] **Step 5: Verify typecheck, lint, tests, and that the resume script still runs**

```bash
npm run check
npm run resume
```

Expected: check passes (81 tests). `npm run resume` prints `Wrote docs/resume-ic.md` then `PDF up to date` (or reprints if the HTML changed; either is fine).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/build-resume.ts scripts/audit-responsive.ts .gitignore
git commit -m "Replace playwright-core with a pinned @playwright/test

One copy of the browser protocol for the resume printer, the audit
script, and the coming e2e suite.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Shared layout-checks module, Node half first

**Files:**
- Create: `src/lib/layout-checks.ts`
- Create: `src/lib/layout-checks.test.ts`

**Interfaces:**
- Produces:

```ts
export type ProfileOptions = {
  viewport: { width: number; height: number };
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
};
export type Profile = { name: string; options: ProfileOptions };
export const profiles: Profile[];

export type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
export type ElementFact = {
  index: number;
  description: string;     // tag, id, first three classes, first 40 chars of text
  rect: Rect;
  fontSize: number;
  hasOwnText: boolean;     // has a non-whitespace text node of its own
  rendered: boolean;       // display != none, visibility != hidden, non-empty box
  clipped: boolean;        // 1x1 or smaller: the sr-only pattern
  interactive: boolean;    // matches the interactive selector
  containedBy: number | null; // index of the nearest ancestor (below body) whose overflow-x is auto, scroll, hidden or clip
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
export function collectLayoutFacts(): LayoutFacts;          // browser side (Task 3)
export function overflowingElements(facts: LayoutFacts): ElementFact[];
export function smallTargets(facts: LayoutFacts, minimum?: number): ElementFact[];
export function tinyText(facts: LayoutFacts, minimum?: number): ElementFact[];
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/layout-checks.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npx vitest run src/lib/layout-checks.test.ts
```

Expected: FAIL, `Failed to resolve import "@/lib/layout-checks"`.

- [ ] **Step 3: Write the module with the Node half and a stub browser half**

Create `src/lib/layout-checks.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/lib/layout-checks.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout-checks.ts src/lib/layout-checks.test.ts
git commit -m "Add the shared layout-checks module: profiles and pure predicates

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Browser half of layout-checks, and the audit script uses it

**Files:**
- Modify: `src/lib/layout-checks.ts` (replace the `collectLayoutFacts` stub)
- Modify: `scripts/audit-responsive.ts` (delete its own `collectLayoutFacts` and `profiles`; import both)

**Interfaces:**
- Consumes: types and predicates from Task 2.
- Produces: a working `collectLayoutFacts()` that returns `LayoutFacts` when passed to `page.evaluate`.

There is no jsdom test for this function: it depends on real layout. The audit script run in Step 3 is its test, and Task 6's e2e suite exercises it on every route.

- [ ] **Step 1: Replace the stub**

In `src/lib/layout-checks.ts`, replace the stub `collectLayoutFacts` with:

```ts
/**
 * Browser side. Self-contained on purpose: Playwright serialises this function with
 * toString(), so nothing outside its body exists when it runs.
 */
export function collectLayoutFacts(): LayoutFacts {
  const interactiveSelector =
    "a[href], button, input, select, textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])";
  const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
  const indexOf = new Map<Element, number>();
  all.forEach((el, i) => indexOf.set(el, i));

  const describe = (el: Element) => {
    const id = el.id ? `#${el.id}` : "";
    const classes =
      typeof el.className === "string" && el.className.trim()
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${classes}${text ? ` "${text}"` : ""}`;
  };
  const round = (n: number) => Math.round(n * 100) / 100;

  const containing = ["auto", "scroll", "hidden", "clip"];
  const contains = all.map((el) => containing.includes(getComputedStyle(el).overflowX));

  const elements: ElementFact[] = all.map((el, index) => {
    const style = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const hasOwnText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 0,
    );
    let containedBy: number | null = null;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const i = indexOf.get(p);
      if (i !== undefined && contains[i]) {
        containedBy = i;
        break;
      }
    }
    return {
      index,
      description: describe(el),
      rect: {
        left: round(r.left),
        top: round(r.top),
        right: round(r.right),
        bottom: round(r.bottom),
        width: round(r.width),
        height: round(r.height),
      },
      fontSize: parseFloat(style.fontSize),
      hasOwnText,
      rendered: style.display !== "none" && style.visibility !== "hidden" && r.width > 0 && r.height > 0,
      clipped: r.width <= 1 && r.height <= 1,
      interactive: el.matches(interactiveSelector),
      containedBy,
    };
  });

  const doc = document.documentElement;
  return {
    title: document.title,
    viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    scrollHeight: doc.scrollHeight,
    elements,
  };
}
```

`ElementFact` and `LayoutFacts` appear only as type annotations. Types are erased, so the serialised function has no dangling references.

- [ ] **Step 2: Rewrite the audit script on top of the module**

Replace the whole of `scripts/audit-responsive.ts` with:

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import {
  collectLayoutFacts,
  overflowingElements,
  profiles,
  smallTargets,
  tinyText,
} from "@/lib/layout-checks";
import { site } from "@/data/site";

// Captures the deployed site across device profiles and themes, then records
// layout facts (overflow, small tap targets, tiny text) and axe violations for
// each capture. Output lands in audit-out/, which is gitignored. Usage:
//   npx tsx scripts/audit-responsive.ts [--base https://host] [--routes /,/resume]

const themes = ["light", "dark"] as const;
const defaultRoutes = ["/", "/projects", "/resume", "/writing", "/no-such-page"];

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const root = process.cwd();
  const base = (argValue("--base") ?? site.url).replace(/\/$/, "");
  const routes = argValue("--routes")?.split(",") ?? defaultRoutes;
  const outDir = path.join(root, "audit-out");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  const results = [];
  try {
    for (const route of routes) {
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
      const dir = path.join(outDir, slug);
      mkdirSync(dir, { recursive: true });
      for (const profile of profiles) {
        for (const theme of themes) {
          const context = await browser.newContext({ ...profile.options, colorScheme: theme });
          const page = await context.newPage();
          // tsx compiles with esbuild keepNames, which wraps nested functions in a
          // __name helper that does not exist inside the page. Provide a no-op.
          await page.addInitScript("window.__name = (fn) => fn;");
          // "load" plus fonts, not networkidle: dev servers keep sockets open and never go idle.
          const response = await page.goto(base + route, { waitUntil: "load" });
          await page.evaluate(() => document.fonts.ready);
          // Layout does not depend on theme; collect facts once per profile.
          const facts = theme === "light" ? await page.evaluate(collectLayoutFacts) : undefined;
          const axe = await new AxeBuilder({ page })
            .options({ rules: { "target-size": { enabled: true } } })
            .analyze();
          const screenshot = path.join(dir, `${profile.name}-${theme}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          await context.close();

          const violations = axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            count: v.nodes.length,
            targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
          }));
          const summary = facts
            ? {
                title: facts.title,
                viewportMeta: facts.viewportMeta,
                innerWidth: facts.innerWidth,
                scrollWidth: facts.scrollWidth,
                clientWidth: facts.clientWidth,
                scrollHeight: facts.scrollHeight,
                horizontalScroll: facts.scrollWidth > facts.clientWidth,
                overflowing: overflowingElements(facts).map((e) => ({ element: e.description, ...e.rect })),
                interactiveCount: facts.elements.filter((e) => e.interactive && e.rendered).length,
                smallTargets: smallTargets(facts).map((e) => ({ element: e.description, width: e.rect.width, height: e.rect.height })),
                targetsUnder44: smallTargets(facts, 44).length,
                smallText: tinyText(facts).map((e) => ({ element: e.description, fontSize: e.fontSize })),
              }
            : undefined;
          results.push({
            route,
            status: response?.status() ?? null,
            profile: profile.name,
            theme,
            screenshot: path.relative(root, screenshot),
            facts: summary,
            violations,
          });
          const overflow = summary ? ` overflow=${summary.horizontalScroll}` : "";
          console.log(`${route} ${profile.name} ${theme} status=${response?.status()}${overflow} axe=${violations.length}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
  console.log(`Wrote ${path.relative(root, outDir)}/results.json`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
  console.error(`audit-responsive failed: ${message}`);
  process.exit(1);
});
```

- [ ] **Step 3: Run the audit against the deployed site for one route to prove the browser function works**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npm run -s audit:responsive -- --routes /resume 2>&1 | tail -3
python3 -I -c "
import json; rs=json.load(open('audit-out/results.json'))
f=[r for r in rs if r['facts']][0]['facts']
print('innerWidth', f['innerWidth'], 'interactive', f['interactiveCount'], 'small', len(f['smallTargets']), 'overflowing', len(f['overflowing']))"
```

Expected: 12 lines ending `Wrote audit-out/results.json`; the summary prints `innerWidth 320`, a positive interactive count, and numbers rather than an error. If the deployed site predates the tap-target fix, `small` may be non-zero; that is the site, not the function.

- [ ] **Step 4: Typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout-checks.ts scripts/audit-responsive.ts
git commit -m "Collect layout facts in the shared module and use it from the audit script

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Route discovery from the build output

**Files:**
- Create: `src/lib/routes-from-build.ts`
- Create: `src/lib/routes-from-build.test.ts`
- Create: `e2e/routes.ts`

**Interfaces:**
- Produces:

```ts
// src/lib/routes-from-build.ts
export type Route = { path: string; expectedStatus: number };
export function routesFromFiles(htmlFiles: string[]): Route[]; // throws if none usable
// e2e/routes.ts
export const routes: Route[];
```

- [ ] **Step 1: Look at what the export actually produces**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npm run -s build >/dev/null 2>&1; cd out && find . -name '*.html' | sort; cd ..
```

Expected today: `./404.html`, `./_not-found.html`, `./index.html`, `./projects.html`, `./resume.html`, `./writing.html`, and one file per post under `./writing/`. If anything else appears (a file from `public/`, for instance), add it to the test fixture below and decide whether it is a page.

- [ ] **Step 2: Write the failing test**

Create `src/lib/routes-from-build.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npx vitest run src/lib/routes-from-build.test.ts
```

Expected: FAIL, cannot resolve `@/lib/routes-from-build`.

- [ ] **Step 4: Implement the mapping**

Create `src/lib/routes-from-build.ts`:

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx vitest run src/lib/routes-from-build.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Add the filesystem reader for the suite**

Create `e2e/routes.ts`:

```ts
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
```

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck && npm run lint
git add src/lib/routes-from-build.ts src/lib/routes-from-build.test.ts e2e/routes.ts
git commit -m "Discover e2e routes from the static export

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Playwright config, helpers, and a smoke spec that proves the harness

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/helpers.ts`
- Create: `e2e/smoke.spec.ts` (kept: it is the status and heading check for every route)
- Modify: `package.json` scripts

**Interfaces:**
- Consumes: `profiles` (Task 2), `routes` and `Route` (Task 4).
- Produces: `open(page, route): Promise<Response>` in `e2e/helpers.ts`; `npm run test:e2e`.

- [ ] **Step 1: Write the config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";
import { profiles } from "./src/lib/layout-checks";

// CI is read in exactly five places below: channel, retries, trace,
// reuseExistingServer, forbidOnly. Nothing else branches on environment.
const ci = Boolean(process.env.CI);
const baseURL = "http://localhost:8787";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL,
    // Local runs use the installed Chrome, like the resume printer. CI installs
    // Playwright's Chromium and leaves the channel unset.
    channel: ci ? undefined : "chrome",
    trace: ci ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  // browserName is explicit so no device descriptor can pull in WebKit.
  projects: profiles.map((profile) => ({
    name: profile.name,
    use: { browserName: "chromium" as const, ...profile.options },
  })),
  // The build runs before this config loads (see the test:e2e script), so the
  // server only serves. wrangler dev reads out/ from disk, which is why reusing a
  // running server is safe locally (verified in Task 5, Step 6).
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !ci,
  },
});
```

- [ ] **Step 2: Write the navigation helper**

Create `e2e/helpers.ts`:

```ts
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
```

- [ ] **Step 3: Write the smoke spec**

Create `e2e/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { open } from "./helpers";
import { routes } from "./routes";

for (const route of routes) {
  test(`${route.path} responds with ${route.expectedStatus} and renders a heading`, async ({ page }) => {
    await open(page, route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
```

- [ ] **Step 4: Add the scripts**

In `package.json` scripts, add two lines and change `deploy`:

```json
"test:e2e": "npm run build && playwright test",
"test:e2e:ui": "playwright test --ui",
"deploy": "npm run check && npm run test:e2e && wrangler deploy",
```

- [ ] **Step 5: Run the suite and confirm the harness works end to end**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npm run test:e2e 2>&1 | tail -15
```

Expected: the build output, then `[WebServer]` lines from wrangler, then the list reporter with `routes × 6` passing tests (with 7 routes that is 42), ending `42 passed`. If wrangler's first start exceeds 120s the config timeout is the knob; note the time it took.

- [ ] **Step 6: Verify a reused server sees a fresh build**

With no server running, start one by hand, then build a changed page and run against it. The `git diff --quiet` guard makes sure the edit really happened before anything is concluded from it.

```bash
npx wrangler dev --port 8787 > /dev/null 2>&1 &
sleep 5
sed -i '' 's/There is nothing at this address./Nothing lives at this address./' src/app/not-found.tsx
git diff --quiet && { echo "edit did not apply"; exit 1; }
npm run test:e2e -- --project=phone-320 --grep "no-such-page" 2>&1 | tail -3
curl -s http://localhost:8787/no-such-page | grep -o "Nothing lives at this address" | head -1
git checkout src/app/not-found.tsx
pkill -f "wrangler dev --port 8787"
```

Expected: the test passes and `curl` prints the new sentence, proving the running server served the rebuilt file. If `curl` prints nothing, change `reuseExistingServer` to `false` in the config and update its comment to say why.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add playwright.config.ts e2e/helpers.ts e2e/smoke.spec.ts package.json
git commit -m "Add the Playwright harness: profile projects, wrangler web server, smoke spec

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Layout spec

**Files:**
- Create: `e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `collectLayoutFacts`, `overflowingElements`, `tinyText` (Tasks 2 and 3); `open` (Task 5); `routes` (Task 4).

- [ ] **Step 1: Write the spec**

Create `e2e/layout.spec.ts`:

```ts
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

    // 3. Header on one row.
    const centres = header.filter((m) => m.box).map((m) => m.box!.y + m.box!.height / 2);
    expect.soft(Math.max(...centres) - Math.min(...centres), "header wraps onto more than one row").toBeLessThanOrEqual(2);

    // 4. Readable text.
    expect
      .soft(tinyText(facts).map((e) => `${e.description} ${e.fontSize}px`), "text under 12px")
      .toEqual([]);
  });
}
```

- [ ] **Step 2: Run it**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npm run test:e2e -- layout 2>&1 | tail -8
```

Expected: `42 passed` (7 routes × 6 projects). If a soft expectation fails, read the message: it names the route, project, and offending elements. Fix the site only if the failure is a real regression; fix the test if it is a false positive, and record which in the commit message.

- [ ] **Step 3: Commit**

```bash
git add e2e/layout.spec.ts
git commit -m "Assert overflow, chrome tap targets, header row, and text size per route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Accessibility spec

**Files:**
- Create: `e2e/a11y.spec.ts`

**Interfaces:**
- Consumes: `open` (Task 5), `routes` (Task 4), `@axe-core/playwright`.

- [ ] **Step 1: Write the spec**

Create `e2e/a11y.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run it**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npm run test:e2e -- a11y 2>&1 | tail -8
```

Expected: `84 passed` (7 routes × 2 themes × 6 projects).

- [ ] **Step 3: Commit**

```bash
git add e2e/a11y.spec.ts
git commit -m "Run axe with target-size on every route in both themes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Terminal demo spec

**Files:**
- Modify: `src/components/ScrollRegion.tsx` (add `data-slot="scroll-fade"` to the fade div)
- Modify: `src/components/ScrollRegion.test.tsx` (assert the slot exists)
- Create: `e2e/demo.spec.ts`

**Interfaces:**
- Consumes: `open` (Task 5); `projects` from `src/data/projects`; the `ScrollRegion` contract: `role="region"`, `aria-label`, `tabindex="0"`, `data-overflow="true"|"false"`, a sibling fade with `data-slot="scroll-fade"` that hides via `opacity: 0`; the shadcn `Card` root carries `data-slot="card"`.

- [ ] **Step 1: Write the failing unit assertion for the fade slot**

Append to the `describe("ScrollRegion")` block in `src/components/ScrollRegion.test.tsx`:

```tsx
  it("marks the fade so browser tests can find it", () => {
    fakeGeometry(100, 100);
    const { container } = render(
      <ScrollRegion label="Sample output">
        <pre>hello</pre>
      </ScrollRegion>,
    );
    expect(container.querySelector('[data-slot="scroll-fade"]')).not.toBeNull();
  });
```

- [ ] **Step 2: Run it to verify it fails**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
npx vitest run src/components/ScrollRegion.test.tsx
```

Expected: FAIL on the new test, `expected null not to be null`.

- [ ] **Step 3: Add the slot**

In `src/components/ScrollRegion.tsx`, change the fade div's opening to:

```tsx
      <div
        aria-hidden="true"
        data-slot="scroll-fade"
        className={cn(
```

- [ ] **Step 4: Run the unit tests to verify they pass**

```bash
npx vitest run src/components/ScrollRegion.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Write the e2e spec**

Create `e2e/demo.spec.ts`:

```ts
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
```

- [ ] **Step 6: Run it**

```bash
npm run test:e2e -- demo 2>&1 | tail -8
```

Expected: `12 passed` (2 routes × 6 projects).

- [ ] **Step 7: Run the whole suite once, then commit**

```bash
npm run test:e2e 2>&1 | tail -4
git add src/components/ScrollRegion.tsx src/components/ScrollRegion.test.tsx e2e/demo.spec.ts
git commit -m "Assert the terminal demo is focusable and signals overflow per profile

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected before the commit: `180 passed` (42 smoke + 42 layout + 84 a11y + 12 demo).

---

### Task 9: README section

**Files:**
- Modify: `README.md` (add a "Browser tests" section after "Local development")

- [ ] **Step 1: Add the section**

Insert after the "Local development" code block in `README.md`:

```markdown
## Browser tests

`npm run test:e2e` builds the static export, serves it with `wrangler dev`, and runs
Playwright against six device profiles (320 and 375 phones, iPhone 15, 768 tablet, 1024
laptop, 1440 desktop). Routes come from `out/`, so a new page is covered as soon as it
builds. The suite asserts layout invariants rather than screenshots: no horizontal
overflow, header on one row, site chrome tap targets of at least 24px, no text under
12px, zero axe violations with the WCAG 2.2 target-size rule on, and that the terminal
demo is keyboard-reachable and signals when it scrolls.

Locally it drives your installed Chrome and downloads nothing. `npm run deploy` runs it
before shipping. It is not part of `npm run check`, because Cloudflare's build has no
browser. `npm run test:e2e:ui` opens Playwright's UI against the last build.

To run it in GitHub Actions later: check out, set up Node 24, `npm ci`,
`npx playwright install --with-deps chromium`, then `CI=1 npm run test:e2e`, and upload
`test-results/` on failure. The config and tests need no changes; `CI` switches the
browser to Playwright's Chromium, adds one retry, forbids `test.only`, and stops reusing
a running server.

`scripts/audit-responsive.ts` shares the measurement code with the suite and produces
screenshots plus a `results.json` for a one-off review of any URL:
`npm run audit:responsive -- --base https://ghaws.dev`.
```

Also fix the stale "Styling" paragraph while in the file if it still says Pico CSS: replace it with one sentence, "Tailwind v4 with shadcn primitives; theme tokens live in `src/app/globals.css` and the dark mode class is set by next-themes."

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Document the browser test suite and its path to Actions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Prove each test guards its fix

**Files:**
- Modify: `docs/superpowers/plans/2026-10-11-responsive-e2e-suite.md` (append a "Verification log" section with the results)

Work on a scratch branch off whatever branch holds Tasks 1 to 9. Every revert is a scripted edit against exact source text, so each one is followed by a `git diff --quiet` guard: if the text has drifted and nothing changed, the step stops instead of recording a green run as proof. For each row, apply the revert, run the fastest relevant projects, record the first failing test name and the key line of its message, then restore. Each run rebuilds, so expect about a minute per row.

- [ ] **Step 1: Branch**

```bash
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH
git checkout -b scratch/e2e-verification
```

- [ ] **Step 2: Revert A, projects grid**

```bash
sed -i '' 's/<div className="mt-6 grid gap-4">/<div className="mt-6 grid gap-4 sm:grid-cols-2">/' src/app/projects/page.tsx
git diff --quiet && { echo "edit did not apply"; exit 1; }
npm run test:e2e -- --project=desktop-1440 demo 2>&1 | grep -E "✘|Error|expected|Received" | head -6
git checkout src/app/projects/page.tsx
```

Expected: the `/projects` demo test fails on `data-overflow` expected `"false"`, received `"true"`.

- [ ] **Step 3: Revert B, nav tap targets**

```bash
sed -i '' 's/"tap-target transition-colors hover:text-primary"/"transition-colors hover:text-primary"/' src/components/NavLinks.tsx
git diff --quiet && { echo "edit did not apply"; exit 1; }
npm run test:e2e -- --project=phone-375 layout 2>&1 | grep -E "✘|site chrome|About|Writing|Resume" | head -8
git checkout src/components/NavLinks.tsx
```

Expected: every route's layout test fails on "site chrome targets under 24px" listing `About`, `Writing`, `Resume` at height 18.

- [ ] **Step 4: Revert C, brand**

```bash
python3 - <<'EOF'
p="src/components/Brand.tsx"; s=open(p).read()
s=s.replace('<span className="font-semibold sm:hidden">g_</span>\n      ', '').replace('className="hidden before:mr-1.5', 'className="before:mr-1.5').replace(" sm:inline\"", "\"")
open(p,"w").write(s)
EOF
git diff --quiet && { echo "edit did not apply"; exit 1; }
npm run test:e2e -- --project=phone-320 layout 2>&1 | grep -E "✘|widened|wraps|past the viewport" | head -6
git checkout src/components/Brand.tsx
```

Expected: phone-320 layout tests fail. Record whether the failing line is "layout viewport widened", "elements past the viewport edge", or "header wraps onto more than one row": the spec predicted overflow but a wrap is equally valid.

- [ ] **Step 5: Revert D, scroll region focus**

```bash
python3 - <<'EOF'
p="src/components/ScrollRegion.tsx"; s=open(p).read(); open(p,"w").write(s.replace("        tabIndex={0}\n", ""))
EOF
git diff --quiet && { echo "edit did not apply"; exit 1; }
npm run test:e2e -- --project=phone-375 demo a11y 2>&1 | grep -E "✘|tabindex|scrollable-region" | head -6
git checkout src/components/ScrollRegion.tsx
```

Expected: the demo test fails on `tabindex`, and the a11y tests for `/` and `/projects` fail with `scrollable-region-focusable`.

- [ ] **Step 6: Revert E, heading level**

```bash
sed -i '' 's/ headingLevel="h2"//' src/app/projects/page.tsx
git diff --quiet && { echo "edit did not apply"; exit 1; }
npm run test:e2e -- --project=desktop-1440 demo a11y 2>&1 | grep -E "✘|heading-order|heading" | head -6
git checkout src/app/projects/page.tsx
```

Expected: the `/projects` demo test fails to find the level-2 heading, and its a11y test fails with `heading-order`.

- [ ] **Step 7: Return to the working branch, then record**

The scratch branch holds nothing worth keeping. Switch back first, then write the log on the branch that has the suite.

```bash
git checkout -
git branch -D scratch/e2e-verification
```

Append to the plan file a section:

```markdown
## Verification log (filled in during Task 10)

| Revert | Failing test | Message excerpt |
|---|---|---|
| A projects grid | | |
| B nav tap targets | | |
| C brand | | |
| D scroll region focus | | |
| E heading level | | |
```

with the observed values filled in, then:

```bash
git add docs/superpowers/plans/2026-10-11-responsive-e2e-suite.md
git commit -m "Record which e2e test catches each reverted fix

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 8: Final full run**

```bash
npm run check && npm run test:e2e 2>&1 | tail -3
```

Expected: check passes with the new unit tests (85 or more), and the suite reports `180 passed`.
