# Responsive end-to-end test suite

Date: 2026-10-11. Status: approved design, awaiting implementation plan.

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

## Runner and layout

- New dev dependency `@playwright/test`, pinned to the same minor as `playwright-core`
  (currently 1.63) so both share one browser protocol.
- `playwright.config.ts` at the repo root. `testDir` is `e2e/`, outside Vitest's
  `src/**/*.test.{ts,tsx}` glob.
- `webServer`: command `npm run build && npx wrangler dev --port 8787`, `url`
  `http://localhost:8787`, `reuseExistingServer: !process.env.CI`. Tests exercise the
  same `out/` and `_headers` that production serves.
- Browser: Chromium with `channel: "chrome"` when `CI` is unset, so local runs use the
  installed Chrome and download nothing. Under `CI=1` the channel is unset and the
  bundled Chromium is used. This conditional is the only CI switch.
- Projects: one per profile in the shared profile list (phone-320, phone-375, iphone-15,
  tablet-768, laptop-1024, desktop-1440), each carrying that profile's context options.
- Reporter `list`. `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, output to
  `test-results/` (gitignored). `retries: 0` locally, `1` in CI. `fullyParallel: true`.
- Dark mode is set per test with `colorScheme` where theme matters, not as extra projects.
- Scripts: `test:e2e` = `playwright test`; `test:e2e:ui` = `playwright test --ui`;
  `deploy` = `npm run check && npm run test:e2e && npm run build && wrangler deploy`.
  `check` is unchanged.

## Shared measurement module

`src/lib/layout-checks.ts`, imported by `scripts/audit-responsive.ts` and the tests.

- `profiles`: the device profile list as plain data, `{ name, options: BrowserContextOptions }`.
  The config maps it to projects; the audit script iterates it.
- `collectLayoutFacts()`: a single browser-side function (Playwright serialises one
  function per `evaluate`). Returns what the audit script returns today, plus
  `scrollRegions`: for each element with `overflow-x` of `auto` or `scroll` that actually
  overflows, whether it has `tabindex="0"` and an accessible name.
- `isSmallTarget(rect)` and `isOverflowing(rect, viewportWidth)`: the pure predicates
  `collectLayoutFacts` uses, exported so a Vitest unit test can cover them in jsdom.
- The `tsx` `__name` shim stays in the audit script. Playwright Test compiles with its
  own loader and does not need it.
- Vitest covers: the profile list is well-formed (unique names, positive viewports) and
  the predicates classify given rects correctly. Browser-dependent behaviour is covered
  by the e2e suite.

## Routes

`e2e/routes.ts` reads `out/**/*.html` at config load time. Each file becomes a route
(`index.html` → `/`, `projects.html` → `/projects`, `writing/foo.html` → `/writing/foo`).
`404.html` and `_not-found.html` are dropped and one `/no-such-page` route is added, so
the 404 page is tested at its real status. New pages are covered as soon as they build.

## Tests

Each test runs once per project.

### `e2e/layout.spec.ts`, per route

- **No horizontal overflow.** `document.documentElement.scrollWidth` equals
  `clientWidth`, and `window.innerWidth` equals the project viewport width within 1px.
- **Tap targets.** Every visible interactive element (`a[href]`, `button`, `input`,
  `select`, `textarea`, `summary`, `[role=button]`, focusable `[tabindex]`) is at least
  24px on both axes. Failure message lists offenders by tag, class, and text.
- **Header on one row.** The brand link, each nav link, and the theme toggle have
  vertical centres within 2px of each other.
- **Readable text.** No element with its own text node has a computed font size under
  12px.

### `e2e/a11y.spec.ts`, per route, light and dark

- axe via `@axe-core/playwright` with `target-size` enabled reports zero violations.
  Failure message prints rule id, impact, and selectors.

### `e2e/demo.spec.ts`, on `/` and `/projects`

- The terminal demo's scroll region has `role="region"`, an accessible name, and
  `tabindex="0"`.
- On phone profiles (viewport under 640px) the region overflows, the fade element is
  visible, and after `scrollLeft` is set to the end the fade is hidden.
- On profiles of 768px and wider the region does not overflow and the fade is hidden.
- The card heading is an `h2` on `/projects` and an `h3` on `/`.

### Out of scope

Lighthouse scores, performance budgets, and the Cloudflare beacon CSP error. These stay
in the audit script and report.

## Stability and diagnostics

- Every test navigates with `waitUntil: "load"` and then awaits `document.fonts.ready`.
  Never network idle: `wrangler dev` keeps sockets open and never goes idle.
- Pixel comparisons allow 1px (2px for the header row) to absorb sub-pixel rounding at
  2x and 3x scale factors.
- On failure: project name, route, offenders, a screenshot, and (on retry) a trace to
  open with `npx playwright show-trace`.
- Expected cost: the build dominates. With six projects in parallel and about ten
  routes, the tests themselves finish in under a minute locally.

## Path to GitHub Actions

A later workflow: checkout, Node 24, `npm ci`, `npx playwright install --with-deps
chromium`, `CI=1 npm run test:e2e`, upload `test-results/` on failure. No config or test
changes. The README gains a "Browser tests" section now that documents the local command
and this sketch.

## Verifying the suite guards what it claims

On a scratch branch, revert one fix at a time and confirm the matching test fails with a
readable message, then restore:

| Revert | Expected failure |
|---|---|
| Restore `sm:grid-cols-2` on `/projects` | demo: region does not overflow at desktop |
| Remove `tap-target` from `NavLinks` | layout: tap targets, listing the three nav links |
| Replace `Brand` with the old full-name link | layout: no overflow at phone-320 |
| Remove `tabIndex` from `ScrollRegion` | demo: region focusable; a11y: scrollable-region-focusable |
| Pass no `headingLevel` on `/projects` | demo: heading level; a11y: heading-order |

## Files

New: `playwright.config.ts`, `e2e/routes.ts`, `e2e/layout.spec.ts`, `e2e/a11y.spec.ts`,
`e2e/demo.spec.ts`, `src/lib/layout-checks.ts`, `src/lib/layout-checks.test.ts`.
Changed: `scripts/audit-responsive.ts` (imports the shared module), `package.json`
(dependency and scripts), `.gitignore` (`test-results/`, `playwright-report/`),
`README.md` (browser tests section).
