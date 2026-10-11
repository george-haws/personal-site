# Responsive end-to-end test suite

Date: 2026-10-11. Status: approved design, revised after review, awaiting implementation plan.

## Goal

Turn the checks behind the 2026-10-09 responsive audit into a browser test suite that
fails when a layout regression lands. It runs locally as a pre-deploy gate today and
moves to GitHub Actions later without changes to its config or tests.

## Decisions already made

- Runs locally only for now. Cloudflare's build pipeline runs `npm run check && npm run
  build` without a browser, so the suite must stay out of `npm run check` and `npm test`.
- Assertions only, no screenshot comparison. Screenshots and traces are kept as failure
  artifacts for diagnosis.
- Playwright Test, one project per device profile, against the built static export.
- Chromium only. No profile runs WebKit, which is where iOS-specific layout bugs show
  up. Accepted for now; a physical-phone check after deploy covers that gap.

## Build, server, and commands

The build happens before Playwright loads its config, never inside `webServer`, so route
discovery sees the current output and the artifact tested is the artifact shipped.

- `test:e2e` = `npm run build && playwright test`.
- `test:e2e:ui` = `playwright test --ui` (assumes a build exists; the UI is for iterating
  on tests, not for gating).
- `deploy` = `npm run check && npm run test:e2e && wrangler deploy`. One build, tested,
  then shipped. `check` is unchanged.
- `webServer`: command `npx wrangler dev --port 8787`, `url` `http://localhost:8787`,
  `timeout: 120_000`, `reuseExistingServer: !process.env.CI`. `wrangler dev` serves
  `out/` from disk, so a server left running picks up the fresh build. The implementation
  plan verifies this; if it does not hold, `reuseExistingServer` becomes `false`.

## Dependencies

- Add `@playwright/test` pinned to an exact version. Remove the direct `playwright-core`
  dependency: `@playwright/test` depends on an exact `playwright-core` and re-exports
  `chromium` and `devices`, so `scripts/build-resume.ts` and
  `scripts/audit-responsive.ts` import from `@playwright/test` instead. One copy of the
  browser protocol, no patch mismatch.
- `@axe-core/playwright` stays and resolves the same `playwright-core`.

## Runner config

`playwright.config.ts` at the repo root.

- `testDir: "e2e"`, outside Vitest's `src/**/*.test.{ts,tsx}` glob. `fullyParallel: true`.
- Projects: one per entry in the shared profile list, each with `use: { browserName:
  "chromium", ...profile.options }`. `browserName` is set explicitly on every project
  because the iPhone descriptor carries `defaultBrowserType: "webkit"`, which would
  otherwise select a browser that is not installed.
- Browser channel: `channel: "chrome"` when `CI` is unset, so local runs use the
  installed Chrome and download nothing. Under `CI=1` the channel is unset and the
  bundled Chromium is used.
- `retries: process.env.CI ? 1 : 0`. `trace: process.env.CI ? "on-first-retry" :
  "retain-on-failure"`, so local failures also leave a trace. `screenshot:
  "only-on-failure"`. Reporter `list`. Output to `test-results/`.
- `.gitignore` gains `test-results/`, `playwright-report/`, and `blob-report/`.
- `CI` is read in four places: channel, retries, trace mode, and `reuseExistingServer`.
  Nothing else in config or tests branches on environment.
- Dark mode is set per test with `colorScheme: "dark"` where theme matters, not as extra
  projects. `reducedMotion: "reduce"` is set globally so axe never measures contrast
  mid-transition.

## Shared measurement module

`src/lib/layout-checks.ts`, imported by `scripts/audit-responsive.ts` and the tests. It
has two halves with a hard boundary between them.

**Browser half.** `collectLayoutFacts()` is one self-contained function passed to
`page.evaluate`. Playwright serialises it with `toString()`, so it may not reference
anything outside its own body: no imports, no module-level helpers, no predicates. It
returns raw facts only:

- `viewportMeta`, `innerWidth`, `scrollWidth`, `clientWidth`, `scrollHeight`.
- `elements`: for every element under `body` with a non-empty bounding box: a
  description (tag, id, first three classes, first 40 characters of text), its rect, its
  computed `fontSize`, whether it has an own non-whitespace text node, whether it is
  rendered (`display` not `none`, `visibility` not `hidden`), whether it is clipped to
  1×1 (the `sr-only` pattern), whether its own `overflow-x` is `auto` or `scroll`, and
  the index of its nearest scrolling ancestor, if any.
- `interactive`: indexes into `elements` for `a[href]`, `button`, `input`, `select`,
  `textarea`, `summary`, `[role=button]`, and `[tabindex]` not `-1`, each with its
  `tabindex`, `role`, and accessible name as computed from `aria-label` or text.

**Node half.** Pure functions over those facts, unit-tested in Vitest with hand-built
fixtures, no jsdom needed:

- `overflowingElements(facts)`: elements whose right edge passes `innerWidth + 1` or
  whose left edge is below `-1`, excluding descendants of scrolling ancestors. This is
  the element-level overflow check that `scrollWidth === clientWidth` alone misses when
  `overflow-x: hidden` papers over a regression.
- `smallTargets(facts, indexes)`: among the given interactive indexes, those rendered and
  not clipped whose width or height is under 24.
- `tinyText(facts)`: rendered, unclipped elements with an own text node and font size
  under 12.
- `scrollRegions(facts)`: scrolling elements whose content overflows, with whether they
  are focusable (`tabindex="0"`) and named.
- `profiles`: the device profile list, `{ name, options }`, with `defaultBrowserType`
  already stripped from the iPhone descriptor. Vitest asserts names are unique and
  viewports positive.

The `tsx` `__name` shim stays in the audit script. Playwright Test compiles with its own
loader and does not need it.

## Routes

`e2e/routes.ts` reads `out/**/*.html` when the config loads. Each file becomes a route
(`index.html` → `/`, `projects.html` → `/projects`, `writing/foo.html` → `/writing/foo`).
`404.html` and `_not-found.html` are dropped and `/no-such-page` is added with
`expectedStatus: 404`; every other route expects 200. If no HTML files are found the
module throws, so a missing build fails loudly instead of generating zero tests.

## Tests

Each test runs once per project. Every navigation uses `waitUntil: "load"`, then awaits
`document.fonts.ready`, then asserts the response status matches the route's expected
status. Never network idle: `wrangler dev` keeps sockets open.

### `e2e/layout.spec.ts`: one test per route

One navigation, one `collectLayoutFacts()` call, then four `expect.soft` checks so a
single run reports every failure:

- **No horizontal overflow.** `scrollWidth` equals `clientWidth`, `innerWidth` equals
  the project viewport width within 1px, and `overflowingElements` is empty. Failure
  lists offenders.
- **Site chrome tap targets.** The brand link, each nav link, each footer link, and the
  theme toggle are at least 24px on both axes. Scoped to chrome we control; inline links
  in prose are exempt under WCAG 2.5.8 and left to axe, which implements the inline and
  spacing exceptions.
- **Header on one row.** Vertical centres of the brand link, nav links, and theme toggle
  are within 2px of each other.
- **Readable text.** `tinyText` is empty.

### `e2e/a11y.spec.ts`: one test per route per theme

- For dark, the test first asserts `html` has the `dark` class, so a theme default
  change cannot silently turn the dark run into a second light run.
- axe via `@axe-core/playwright` with `target-size` enabled and **no tag filter**, so
  best-practice rules such as `heading-order` run. Zero violations. Failure prints rule
  id, impact, and selectors.

### `e2e/demo.spec.ts`: on `/` and `/projects`

- The terminal demo's scroll region has `role="region"`, an accessible name, and
  `tabindex="0"`.
- Overflow state is read from the region's `data-overflow` attribute, which
  `ScrollRegion` maintains, and the fade's visibility from its computed `opacity`,
  because the fade hides with `opacity: 0` and Playwright's `toBeHidden()` treats that as
  visible. Both are web-first assertions (`toHaveAttribute`, `toHaveCSS`) that poll,
  since the value updates asynchronously after scrolling.
  - Viewports under 640px: `data-overflow="true"` and fade opacity `1`; after setting
    `scrollLeft` to the end, `data-overflow="false"` and opacity `0`.
  - Viewports of 768px and wider: `data-overflow="false"` and opacity `0`.
- The card heading is an `h2` on `/projects` and an `h3` on `/`.

### Out of scope

Lighthouse scores, performance budgets, the Cloudflare beacon CSP error (the beacon only
exists on the deployed site), and WebKit rendering. These stay with the audit script,
the report, and the physical-phone check.

## Stability and diagnostics

- Pixel comparisons allow 1px (2px for the header row) to absorb sub-pixel rounding at
  2x and 3x scale factors.
- Local and CI render the same text widths because the only font is JetBrains Mono,
  self-hosted through `next/font`. System font differences between macOS and Ubuntu do
  not reach the layout.
- On failure: project name, route, offenders, a screenshot, and a trace to open with
  `npx playwright show-trace`.
- Expected cost: the build dominates. Six projects in parallel over about ten routes,
  one navigation per route for layout and two for a11y, finish in under a minute locally.

## Path to GitHub Actions

A later workflow: checkout, Node 24, `npm ci`, `npx playwright install --with-deps
chromium`, `CI=1 npm run test:e2e`, upload `test-results/` on failure. No config or test
changes. The README gains a "Browser tests" section now that documents the local command
and this sketch.

## Verifying the suite guards what it claims

On a scratch branch, revert one fix at a time, run the suite, record which test actually
fails and confirm its message names the cause, then restore. Expected failures are a
prediction, not a requirement; the plan records what happened.

| Revert | Expected failure |
|---|---|
| Restore `sm:grid-cols-2` on `/projects` | demo: `data-overflow` true at desktop |
| Remove `tap-target` from `NavLinks` | layout: site chrome tap targets, listing the three nav links |
| Replace `Brand` with the old full-name link | layout: no overflow at phone-320, or header on one row if it wraps instead |
| Remove `tabIndex` from `ScrollRegion` | demo: region focusable; a11y: `scrollable-region-focusable` |
| Pass no `headingLevel` on `/projects` | demo: heading level; a11y: `heading-order` |

## Files

New: `playwright.config.ts`, `e2e/routes.ts`, `e2e/layout.spec.ts`, `e2e/a11y.spec.ts`,
`e2e/demo.spec.ts`, `src/lib/layout-checks.ts`, `src/lib/layout-checks.test.ts`.
Changed: `scripts/audit-responsive.ts` and `scripts/build-resume.ts` (import from
`@playwright/test`; the audit script uses the shared module), `package.json` (swap
`playwright-core` for `@playwright/test`, scripts), `.gitignore`, `README.md`.
