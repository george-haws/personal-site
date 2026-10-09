# Personal site

Static site built with Next.js (static export), styled by Pico CSS, deployed to Cloudflare.

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

There is none of our own. Components are bare semantic HTML and the classless build of [Pico CSS](https://picocss.com) provides the look, including dark mode from the OS setting. To restyle the site later, remove the Pico import in `src/app/layout.tsx` and add whatever comes next. The markup stays.

## Local development

    npm install
    npm run dev        # http://localhost:3000
    npm run check      # typecheck + lint + tests
    npm run build      # static export to out/
    npm run resume     # regenerate the resume Markdown and PDF

## Deployment (Cloudflare, free tier)

The site deploys from GitHub on every push to `main`. One-time setup:

1. In the Cloudflare dashboard, go to Workers & Pages, click Create, choose the Workers tab, and pick Import a repository. Select `george-haws/personal-site`.
2. Set the build command to `npm run check && npm run build` and the deploy command to `npx wrangler deploy` (the default). Production branch: `main`.
3. After the first deploy, open the Worker's Settings, Domains & Routes, and add your custom domain. If the domain's DNS is on Cloudflare this is one click; otherwise add the CNAME it shows you at your registrar.

Every other branch gets a preview URL. A failed check or build leaves the last good deploy live.

If the dashboard's Pages flow is simpler on the day, it works too: build command `npm run check && npm run build`, output directory `out`.

To deploy from a laptop instead: `npx wrangler login` once, then `npm run deploy`.
