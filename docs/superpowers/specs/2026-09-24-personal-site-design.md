# Personal Site — Design

Date: 2026-09-24
Status: Approved

## Goal

A personal site for a software engineer with 15 years of experience: an
about page, a resume, and a projects list. Minimize cost. The only
recurring expense is the domain the owner already holds; hosting is free.

Source is hosted at https://github.com/george-haws/personal-site (public).

Writing (blog posts) and a playground for interactive demos are
deliberately out of scope for this version. The structure leaves an
obvious place for each so adding them later is additive, not a
restructure.

## Decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js, App Router, TypeScript | Owner's preference; keeps a future server mode available |
| Rendering | Static export (`output: 'export'`) | No runtime, deployable anywhere for free |
| Styling | Pico CSS, classless build; no CSS framework of our own | Out-of-the-box skin on bare semantic HTML; a future overhaul is a stylesheet swap, not a component rewrite |
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
      layout.tsx          # shell: header nav, footer, default metadata, Pico import
      page.tsx            # home / about
      resume/page.tsx
      projects/page.tsx
      not-found.tsx       # branded 404
    components/
      NavLinks.tsx        # pure nav list, takes currentPath
      Nav.tsx             # client wrapper around NavLinks (reads usePathname)
      SocialLinks.tsx
      ProjectCard.tsx
      ResumeSection.tsx   # ExperienceEntry and SkillGroups
    data/
      site.ts             # name, tagline, bio, social links
      resume.ts           # experience entries and skill groups
      projects.ts         # project list
    lib/
      types.ts            # SiteInfo, Experience, SkillGroup, Project
      dates.ts            # formatMonth, formatDateRange
      resume.ts           # sortByStartDesc
  public/                 # favicon, headshot, resume.pdf (optional)
  next.config.ts
  wrangler.jsonc
  package.json
```

Future additions slot in without touching the above: `content/posts/`
plus `src/app/writing/` for writing; `src/app/playground/` for demos.

## Styling

The site is intentionally unstyled by us. Components emit semantic
HTML (`header`, `nav`, `main`, `article`, `dl`, `footer`, headings,
lists) with no class names, and the classless build of Pico CSS
(`@picocss/pico/css/pico.classless.min.css`, imported once in the root
layout) provides the look, including automatic dark mode from the OS
setting and styling for the active nav link via `aria-current`.

Rules that keep the overhaul cheap later:

- No `className` on any element. Project cards stack vertically; Pico's
  classless build has no grid helper, and a grid is a job for the future
  styling overhaul.
- No custom CSS files. No `next/font`. No Tailwind.
- If a visual need cannot be met by semantic HTML, prefer a more
  specific element (`small`, `code`, `kbd`, `dl`) over a class.

Overhauling later means removing the Pico import and adding whatever
styling system is chosen then. The markup stays.

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

- **NavLinks**: pure; renders the three routes and sets
  `aria-current="page"` on the current one. **Nav** is the client
  wrapper that reads the pathname and renders NavLinks.
- **SocialLinks**: renders only the links present in `SiteInfo.links`.
- **ProjectCard**: renders title, summary, description, tech tags;
  renders repo and live links only when the corresponding URL is
  present; renders an image only when one is given.
- **ResumeSection**: exports `ExperienceEntry` (date range, with
  "Present" when `end` is absent) and `SkillGroups`.

## Build and deployment

- Repository: https://github.com/george-haws/personal-site. Cloudflare
  Git integration builds on every push.
- Cloudflare build command: `npm run check && npm run build`. Deploy
  command: `npx wrangler deploy` (reads `wrangler.jsonc`, which points
  at `out/`). Production branch: `main`; other branches get preview
  URLs.
- Deploy as a Cloudflare Workers static-assets project. If the dashboard
  makes Cloudflare Pages the simpler path on setup day, use it with
  output directory `out`; both are free.
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
  rules and helpers:
  - `formatDateRange` and `sortByStartDesc`.
  - `ProjectCard` renders links only for URLs that are present.
  - `ExperienceEntry` renders "Present" for a missing end date.
  - `NavLinks` marks the current route with `aria-current`.
  - `SocialLinks` renders only present links.
- **Build gate**: Cloudflare runs `npm run check` (typecheck, lint,
  tests) before `npm run build`. A failure leaves the previous deploy
  live; a bad push cannot take the site down.
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
- Custom visual design. Pico's defaults are the design until the
  overhaul. Dark mode comes from Pico following the OS setting; no
  manual toggle.
- Contact form. (Email link only.)
