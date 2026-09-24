# Personal Site — Design

Date: 2026-09-24
Status: Approved

## Goal

A personal site for a software engineer with 15 years of experience: an
about page, a resume, and a projects list. Minimize cost. The only
recurring expense is the domain the owner already holds; hosting is free.

Writing (blog posts) and a playground for interactive demos are
deliberately out of scope for this version. The structure leaves an
obvious place for each so adding them later is additive, not a
restructure.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js, App Router, TypeScript | Owner's preference; keeps a future server mode available |
| Rendering | Static export (`output: 'export'`) | No runtime, deployable anywhere for free |
| Styling | Tailwind CSS | Default tooling, no runtime cost in a static build |
| Content | Typed TypeScript data files | Edits are type-checked; no CMS or content pipeline to run |
| Hosting | Cloudflare Workers static assets, Git integration | Free, unlimited bandwidth, preview deploys per branch, backend path later |
| Domain | Owner's existing domain via CNAME | No new cost |
| Tests | Vitest + React Testing Library | Small, fast, covers rendering rules that types cannot |

## Architecture

One Next.js app. Three layers with one-way dependencies:

1. **Data** (`src/data/*.ts`): exports typed arrays and objects. Knows
   nothing about rendering.
2. **Components** (`src/components/*.tsx`): take data as props. Know
   nothing about where the data came from.
3. **Pages** (`src/app/**/page.tsx`): import data, pass it to
   components, export page metadata.

The build has no server runtime, no API routes, and no image
optimization service. Images are served unoptimized from `public/`,
which is fine for a handful of small assets.

### Layout

```
personal-site/
  src/
    app/
      layout.tsx          # shell: header nav, footer, default metadata
      page.tsx            # home / about
      resume/page.tsx
      projects/page.tsx
      not-found.tsx       # branded 404
      globals.css
    components/
      Nav.tsx
      ProjectCard.tsx
      ResumeSection.tsx   # one experience entry or one skill group
    data/
      site.ts             # name, tagline, bio, social links
      resume.ts           # experience entries and skill groups
      projects.ts         # project list
    lib/
      types.ts            # SiteInfo, Experience, SkillGroup, Project
  public/                 # favicon, headshot, resume.pdf (optional)
  next.config.ts
  tailwind.config.ts
  package.json
```

Future additions slot in without touching the above: `content/posts/`
plus `src/app/writing/` for writing; `src/app/playground/` for demos.

## Content model

Defined in `src/lib/types.ts`.

- **SiteInfo**: `name`, `tagline`, `bio` (short paragraph), `links`
  (GitHub, LinkedIn, email), optional `resumePdf` path under `public/`.
- **Experience**: `company`, `role`, `location`, `start` (ISO month,
  `YYYY-MM`), optional `end` (same format; absent means current),
  `highlights` (string list), optional `tech` tags.
- **SkillGroup**: `label` and `skills` (string list), e.g. "Languages",
  "Infrastructure".
- **Project**: `title`, `summary` (one line), `description` (longer),
  `tech` tags, optional `repoUrl`, optional `liveUrl`, optional `image`
  path under `public/`, `featured` boolean.

## Pages

- **Home** (`/`): bio and social links from `site.ts`; projects where
  `featured` is true, rendered as cards.
- **Resume** (`/resume`): experience entries in reverse chronological
  order by `start`, then skill groups. A download link appears only when
  `resumePdf` is set.
- **Projects** (`/projects`): every project as a card.
- **404**: custom `not-found.tsx` with the site shell and a link home.

Each page exports Next.js `metadata` with a title and description. The
root layout sets a title template (`%s · <name>`) so pages supply only
their own segment.

## Components

- **Nav**: renders the three routes; marks the current route as active.
- **ProjectCard**: renders title, summary, tech tags; renders repo and
  live links only when the corresponding URL is present.
- **ResumeSection**: renders one experience entry (date range, with
  "Present" when `end` is absent) or one skill group.

## Build and deployment

- Repository on GitHub. Cloudflare Git integration builds on every push.
- Build command: `npm run build` (runs `next build`; export writes
  `out/`). Output directory: `out`. Production branch: `main`; other
  branches get preview URLs.
- Deploy as a Cloudflare Workers static-assets project. If the dashboard
  makes Cloudflare Pages the simpler path on setup day, use it; the
  build settings are identical and both are free.
- Custom domain: CNAME from the owner's domain to the deployment.
  Cloudflare provisions the certificate.
- Local development: `npm install`, `npm run dev`. No environment
  variables or secrets.

## Verification and error handling

Static export removes runtime failure modes (no server, no database,
no auth). What remains is content mistakes and build breakage.

- **Types**: malformed content (missing title, bad date shape) fails
  `tsc` before it reaches a deploy.
- **Unit tests** (Vitest + React Testing Library) on pure rendering
  rules:
  - `ProjectCard` renders links only for URLs that are present.
  - `ResumeSection` renders "Present" for a missing end date and formats
    the date range.
  - `Nav` marks the current route active.
- **Build gate**: `npm run build` includes typecheck and lint. A failed
  build leaves the previous deploy live; a bad push cannot take the site
  down.
- **404**: handled by `not-found.tsx`.

## Cost

| Item | Cost |
|---|---|
| Hosting | $0 |
| Domain | Already owned |
| Backend, if ever needed | $0 on Cloudflare Workers free tier at personal scale |

## Out of scope for this version

- Writing / blog and RSS.
- Playground / interactive demos.
- Analytics. (Cloudflare Web Analytics is free and can be added later
  with one script tag.)
- Dark mode toggle. (Tailwind's `dark:` variant following the OS setting
  is acceptable if it falls out naturally; a manual toggle is not.)
- Contact form. (Email link only.)
