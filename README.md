# Personal site

Static site built with Next.js (static export), styled with Tailwind, deployed to Cloudflare.

## Editing content

All content lives in `src/data/`:

- `site.ts`: name, tagline, bio, location, site URL, social links, and `resumePdf` (the path of the generated PDF, `/resume.pdf`).
- `resume.ts`: `headline`, `summary`, `experience` entries (dates are `YYYY-MM`; omit `end` for a current role) and `skillGroups`.
- `projects.ts`: projects; set `featured: true` to show one on the home page. `demo` is optional sample terminal output, a list of lines made of styled spans, shown on the card in place of an image.

Types in `src/lib/types.ts` catch shape mistakes at `npm run typecheck`.

## Resume exports

`docs/resume-ic.md` and `public/resume.pdf` are generated from `src/data/resume.ts` and `src/data/site.ts`. After editing either file, run `npm run resume` and commit `docs/resume-ic.md`, `docs/resume-ic.html`, and `public/resume.pdf`. `npm run check` fails until you do.

The PDF is printed by your installed Google Chrome; nothing is downloaded. `docs/resume-ic.html` is the page it was printed from. If that page hasn't changed, the script skips printing; pass `npm run resume -- --force` to reprint anyway.

## Styling

Tailwind v4 with shadcn primitives; theme tokens live in `src/app/globals.css` and the dark mode class is set by next-themes.

## Local development

    npm install
    npm run dev        # http://localhost:3000
    npm run check      # typecheck + lint + tests
    npm run build      # static export to out/
    npm run resume     # regenerate the resume Markdown and PDF

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

## Deployment (Cloudflare, free tier)

The site deploys from GitHub on every push to `main`. One-time setup:

1. In the Cloudflare dashboard, go to Workers & Pages, click Create, choose the Workers tab, and pick Import a repository. Select `george-haws/personal-site`.
2. Set the build command to `npm run check && npm run build` and the deploy command to `npx wrangler deploy` (the default). Production branch: `main`.
3. After the first deploy, open the Worker's Settings, Domains & Routes, and add your custom domain. If the domain's DNS is on Cloudflare this is one click; otherwise add the CNAME it shows you at your registrar.

Every other branch gets a preview URL. A failed check or build leaves the last good deploy live.

If the dashboard's Pages flow is simpler on the day, it works too: build command `npm run check && npm run build`, output directory `out`.

To deploy from a laptop instead: `npx wrangler login` once, then `npm run deploy`.
