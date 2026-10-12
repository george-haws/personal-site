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
    npm run dev        # http://localhost:3000, no analytics
    npm run preview    # the static export behind the Worker, analytics off
    npm run check      # typecheck + lint + tests
    npm run build      # static export to out/
    npm run resume     # regenerate the resume Markdown and PDF
    npm run types      # regenerate worker/worker-configuration.d.ts after changing wrangler.jsonc

## Analytics

Page views are recorded at the edge, not by a third-party script. The Worker in `worker/` runs in front of the static assets for every path outside `/_next/`, serves the asset unchanged, and then reports document loads (and `/resume.pdf`) to an analytics provider in the background. Internal links navigate client-side, so `RouteTracker` in the layout POSTs each route change to the Worker at `/nav` on the site's own origin. Nothing loads from a third-party host and the path matches no rule in EasyPrivacy or uBlock's lists, so ad blockers have nothing to block. The provider is one function behind `createProvider` in `worker/provider.ts`; the first is Umami Cloud's free plan.

One-time setup:

1. Create a free account at umami.is, add a website for `ghaws.dev`, and copy its website ID.
2. Paste the ID into `UMAMI_WEBSITE_ID` in `wrangler.jsonc`. With it empty, the Worker serves the site and tracks nothing.
3. The default endpoint is `https://gateway.umami.is/api/send`, the host Umami's sending-stats docs give for Cloud. The dashboard's tracking snippet loads its script from `cloud.umami.is`. If events do not arrive after the next step, add `UMAMI_ENDPOINT` to `vars` in `wrangler.jsonc` with the value `https://cloud.umami.is/api/send`.
4. Push to `main`. Then verify: visit the site with and without an ad blocker and confirm both show in Umami with the correct country (check from a phone on cellular or a VPN exit abroad; a visit that merely shows some country could be the Worker's own address). Reload once and confirm the repeat shows. With uBlock Origin enabled, click to a second page without reloading and confirm it appears and the `/nav` request is not blocked. Open the PDF and confirm `/resume.pdf` appears.

If visits show the wrong country, Umami is ignoring the `ip` payload field. In `worker/providers/umami.ts`, add an `x-umami-client-ip` header set to `view.ip`; Umami Cloud reads that header before any other IP header.

### Tagging links

Every link you place carries standard UTM parameters, so the dashboard shows which link brought a visitor. Untagged visits still show the referrer, but LinkedIn's mobile app often sends none, and the referrer never says which post or message.

| Parameter | Meaning | Values |
|---|---|---|
| `utm_source` | where the link lives | `linkedin`, `github`, `email`, `resume` |
| `utm_medium` | kind of placement | `profile`, `post`, `message`, `pdf`, `markdown` |
| `utm_campaign` | the specific link, and the per-person slot | a post slug, or company and role such as `acme-staff-eng` |

A link sent to one recruiter: `https://ghaws.dev/?utm_source=linkedin&utm_medium=message&utm_campaign=acme-staff-eng`

The resume exports already tag their site link with `utm_source=resume`. Update the website field on your LinkedIn and GitHub profiles once with `utm_source=linkedin&utm_medium=profile` and `utm_source=github&utm_medium=profile`.

### Swapping providers

Add a file under `worker/providers/` exporting a function that returns `{ track(view) }` for the `PageView` type in `worker/provider.ts`, add a case for it in `createProvider`, add any config it needs to `vars` in `wrangler.jsonc`, run `npm run types`, and set `ANALYTICS_PROVIDER` to its name. Providers must never throw: log and resolve. Plausible's events API takes the IP in an `X-Forwarded-For` header and the user agent in `User-Agent`; Pirsch is server-side by design. Both fit the same shape.

## Deployment (Cloudflare, free tier)

The site deploys from GitHub on every push to `main`. One-time setup:

1. In the Cloudflare dashboard, go to Workers & Pages, click Create, choose the Workers tab, and pick Import a repository. Select `george-haws/personal-site`.
2. Set the build command to `npm run check && npm run build` and the deploy command to `npx wrangler deploy` (the default). Production branch: `main`.
3. After the first deploy, open the Worker's Settings, Domains & Routes, and add your custom domain. If the domain's DNS is on Cloudflare this is one click; otherwise add the CNAME it shows you at your registrar.

Every other branch gets a preview URL. A failed check or build leaves the last good deploy live.

If the dashboard's Pages flow is simpler on the day, it works too: build command `npm run check && npm run build`, output directory `out`.

To deploy from a laptop instead: `npx wrangler login` once, then `npm run deploy`.
