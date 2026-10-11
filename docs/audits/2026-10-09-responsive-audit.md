# Responsive and mobile audit — ghaws.dev

Date: 2026-10-09. Target: the deployed site at https://ghaws.dev.

## Method

- `npm run audit:responsive` (`scripts/audit-responsive.ts`) loads each route in six
  Playwright profiles (320 and 375 phones, iPhone 15 with touch and 3x DPR, 768 tablet,
  1024 laptop, 1440 desktop) in light and dark. Each capture records a full-page
  screenshot, horizontal overflow, interactive elements under 24px and 44px, text under
  12px, and axe violations with the WCAG 2.2 `target-size` rule switched on. Output is in
  `audit-out/` (gitignored).
- Lighthouse 13 CLI, mobile form factor with simulated Slow 4G, one run per route.
- Manual review of the screenshots against an eight-point rubric: horizontal overflow,
  text wrapping, navigation behaviour, stacking order, image or media scaling, touch
  targets, whitespace, and above-the-fold content.
- Routes: `/`, `/projects`, `/resume`, `/writing`, and a 404 (`/no-such-page`).

Emulation is not a device. Safari's dynamic toolbar, real font rendering, and tap
behaviour still want one pass on a physical phone after fixes land.

## Scores (Lighthouse, mobile)

| Route | Perf | A11y | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 94 | 100 | 92 | 100 | 2.9 s | 0 |
| `/projects` | 95 | 98 | 92 | 100 | 2.8 s | 0 |
| `/resume` | 96 | 100 | 92 | 100 | 2.7 s | 0 |
| `/writing` | 97 | 100 | 92 | 100 | 2.4 s | 0 |

Lighthouse no longer ships its old mobile-friendly audits (viewport, font size, tap
targets). The only mobile checks left are axe's `meta-viewport` and `target-size`, and
both pass. Layout findings below come from the screenshots and DOM checks, not Lighthouse.

## What works

- The viewport meta is correct and zoom is not disabled.
- No element is rendered under 12px. Body copy is 14px mono, demo and tags are 12px.
- No cumulative layout shift on any route.
- The resume stacks cleanly on phones: dates drop under the company line, bullets wrap,
  tag chips reflow, and the skills grid collapses to label-over-value. Nothing clips.
- Dark mode matches light mode layout on every capture reviewed.
- The 404 page and writing index are clean at every width.

## Findings

Severity follows the rubric: critical (unusable), high (major overflow or hidden content),
medium (noticeable but usable), low (polish).

### 1. High — the terminal demo clips its lines on every phone and on the projects grid

The status line sample in the project card is a `pre` with `overflow-x-auto`. Its
longest line needs about 540px of content width. Phones give it roughly 270 to 340px, so
every phone capture shows "Figure out why the signup f…" cut mid-word with no visible
scrollbar and nothing to say the rest exists. On `/projects` the card sits in a two-column
grid from 640px up, so the demo is clipped at 768, 1024 and 1440 as well. The site
container is `max-w-3xl` (768px), which means two columns can never be wide enough for
this demo.

Evidence: `audit-out/home/iphone-15-light.png`, `audit-out/projects/tablet-768-light.png`,
`audit-out/projects/desktop-1440-light.png`. Overflow offenders are the three demo spans
with right edges at 437 to 611px in `audit-out/results.json`.

Fix, in order of value:

- `src/app/projects/page.tsx`: drop `sm:grid-cols-2`. With one project the single column
  reads better, and the demo shows whole from 640px up. Revisit if the list grows.
- `src/components/TerminalDemo.tsx`: make the scroll discoverable and reachable. Add
  `tabIndex={0}` and an `aria-label` (this also clears the axe `scrollable-region-focusable`
  violation), and add a right-edge fade when content overflows, for example a wrapper with
  a `mask-image` gradient or an absolutely positioned gradient strip.
- Optionally shorten the sample lines in `src/data/projects.ts` so the key content fits in
  about 40 characters, with the real truncation shown as the status line itself would show it.

### 2. Medium — the header does not fit under 400px, and leaks 8px at 320px

At 375 and 393px the brand "George Haws" wraps to two lines. At 320px the header's
minimum width exceeds the viewport by 8px, so the whole page lays out at 328px and the
browser zooms it out slightly. The nav links butt up against the wrapped brand. The cause
is the sum of the brand (about 110px), three nav links with `gap-5` (about 190px), the
toggle plus `ml-4` (about 52px), and 48px of page padding.

Evidence: `audit-out/home/phone-320-light.png`, `audit-out/writing/iphone-15-light.png`,
and `innerWidth: 328` for every 320 capture in `results.json`.

Fix options, pick one:

- Recommended: show the `g_` mark (already the favicon) as the brand below `sm` and the
  full name from `sm` up. Keeps one row at every width down to 320 with room to spare.
- Or let the header wrap: `flex-wrap` on the header, brand `whitespace-nowrap`, nav on a
  second row below 400px.
- Or squeeze: `px-4 sm:px-6` on the container, `gap-4 sm:gap-5` on the nav, `ml-3` on the
  toggle. This fits 375 but still not 320.

### 3. Medium — every link is under the 24px WCAG 2.5.8 minimum height

Nav links are 18px tall, footer links 18 to 21px, and the inline "Resume →", "PDF",
"Download PDF" and "Source" links are 20px. axe's `target-size` passes only because the
targets are spaced apart, which is the rule's exception. On a phone these are small
thumb targets, especially the three nav links in a row. The theme toggle is 32px.

Evidence: `smallTargets` for every phone capture in `results.json` (14 of 14 on `/`).

Fix: give nav and footer links a larger hit area without moving the layout, for example
`inline-flex min-h-11 items-center` on the anchors in `NavLinks.tsx` and `SocialLinks.tsx`,
or `py-3 -my-3`. For inline text links add `py-2`. Consider `size-10` or larger for the
toggle on touch widths.

### 4. Low — heading order skips a level on `/projects`

The page has an `h1` and the card renders an `h3`. On the home page the card sits under an
`h2`, so the `h3` is right there. Lighthouse and axe both flag it on `/projects`.

Fix: give `ProjectCard` a heading level prop, or wrap the grid on `/projects` in a section
with a visually hidden `h2`.

### 5. Low — the Content Security Policy blocks Cloudflare Web Analytics on every page

`public/_headers` sets `script-src 'self' 'unsafe-inline'`. Cloudflare injects
`static.cloudflareinsights.com/beacon.min.js`, the browser blocks it, and every page logs a
console error. Either the analytics is wanted, in which case add
`https://static.cloudflareinsights.com` to `script-src` (and `connect-src` for
`https://cloudflareinsights.com`), or it is not, in which case turn off Web Analytics
auto-injection in the Cloudflare dashboard so the beacon stops being injected.

### 6. Low — mobile LCP sits at 2.4 to 2.9 s under simulated Slow 4G

The LCP element is the first body paragraph. Time to first byte is small; most of the time
is the render-blocking stylesheet (about 170 ms) and the 41 KB JetBrains Mono woff2
fetched at high priority. Scores are already in the 90s. If wanted, preload the font or
subset it further. Not worth a layout change.

## Fixes applied (2026-10-11)

Findings 1 to 5 were fixed and verified against a local `next build` served by
`wrangler dev`, using the same capture script. Finding 6 was left as is.

| # | Change | Verified by |
|---|---|---|
| 1 | `/projects` is a single column. The demo `pre` sits in a new `ScrollRegion` client component: `role="region"`, `aria-label`, `tabIndex=0`, and a right-edge fade that shows only while content remains to the right. The `pre` is `w-max min-w-full` so its background spans the scrolled width. | Demo whole at 1440 on `/projects`; fade visible on phones; axe `scrollable-region-focusable` gone. `ScrollRegion.test.tsx`, `TerminalDemo.test.tsx`. |
| 2 | New `Brand` component: `g_` below `sm`, `> George Haws` from `sm` up, `aria-label` keeps the accessible name constant. | `innerWidth` is 320 at the 320 profile on every route (was 328). Header is one row at 320, 375 and 393. `Brand.test.tsx`. |
| 3 | `tap-target` utility in `globals.css` (`inline-flex`, `min-height: 44px`, negative block margin so layout does not move) on nav, footer, brand, and inline text links. Brand also gets `min-w-11`. | Zero interactive elements under 24px on any route or profile (was 12 to 14 per page). Remaining under-44 items are the 32px theme toggle and three narrow inline links, all over 24px. |
| 4 | `ProjectCard` takes `headingLevel`; `/projects` passes `h2`. | axe `heading-order` gone on `/projects`. `ProjectCard.test.tsx`. |
| 5 | `public/_headers` allows `https://static.cloudflareinsights.com` in `script-src` and adds `connect-src 'self' https://cloudflareinsights.com`. | Header present on the local build. Console check needs the deployed site, since the beacon is injected by Cloudflare. |

The capture script now waits for `load` plus fonts rather than network idle, because a
dev server keeps sockets open and never goes idle.

## Not an issue, checked

- Footer wraps to two rows below about 380px by design (`flex-wrap`), and reads fine.
- Tag chips wrap cleanly on all cards and resume entries.
- No images on the site yet; the `img` branch in `ProjectCard` is `w-full` and will scale.
- The `/writing` route is live and matches the other pages at every width.

## Rerun

```
export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH   # homebrew node is broken
npm run audit:responsive                                  # defaults to the deployed site
npm run audit:responsive -- --base http://localhost:3000  # against next dev
npx lighthouse@latest https://ghaws.dev --output=json --output-path=./lh.json --chrome-flags="--headless=new"
```
