# Writing section: publish MDX posts on the site

**Status:** approved in brainstorming, ready for an implementation plan
**First post:** `docs/drafts/fast-validation-for-ai-driven-development.md`, already drafted and reviewed

## Goal

Add a Writing section to the site so posts can be published at `/writing/<slug>` with an index at `/writing`, and publish the fast-validation post as the first entry. Posts are authored as MDX files. The site stays a static export deployed with Wrangler.

Also prepare a short LinkedIn post that links to the published URL. That is a text file, not site code.

## Decisions already made

- Section name is Writing. Index at `/writing`, posts at `/writing/<slug>`. Nav becomes About, Writing, Resume.
- Posts are MDX files, one per post, in `src/content/writing/`.
- Post metadata lives in a TypeScript registry, not in frontmatter. This matches how projects and the resume are data-driven, avoids filesystem reads and frontmatter plugins, and makes the published set a reviewable array with a test.
- Styling is done by mapping Markdown elements to styled elements in `mdx-components.tsx`, not with the Tailwind typography plugin, so posts stay on the terminal theme without overriding plugin defaults.
- Out of scope: RSS, tags, reading time, a writing section on the home page, cross-posting anywhere other than a LinkedIn post with a link.

## Content

- Move the draft to `src/content/writing/fast-validation-for-ai-driven-development.mdx`. Remove its H1 line; the page renders the title from the registry. The body starts at the first H2.
- The body uses only: H2 headings, paragraphs, bold, one GFM table, two ordered lists. Nothing else needs styling for this post.
- The LinkedIn post goes in `docs/drafts/fast-validation-linkedin.md`: a hook, a few lines, and the canonical URL `https://ghaws.dev/writing/fast-validation-for-ai-driven-development`.

## Data

Add to `src/lib/types.ts`:

```ts
export type Post = {
  /** URL segment under /writing, also the MDX file name without extension. */
  slug: string;
  title: string;
  /** One or two sentences, shown on the index and used as the page description. */
  description: string;
  /** ISO date, e.g. "2026-10-09". */
  published: string;
};
```

Add `src/data/posts.ts` exporting `posts: Post[]` with the first entry:

- slug: `fast-validation-for-ai-driven-development`
- title: `Elevate the constraint: validation in the AI era`
- description: one or two sentences stating the thesis, written at implementation time from the post's opening.
- published: the date it ships, set at implementation time.

Add `src/data/posts.test.ts` checking: slugs are unique, slugs match `^[a-z0-9]+(-[a-z0-9]+)*$`, every `published` value parses as a date, and every slug has a matching file in `src/content/writing/`.

## MDX setup

Follow the bundled guide at `node_modules/next/dist/docs/01-app/02-guides/mdx.md`.

- Install `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`, and `remark-gfm`.
- In `next.config.ts`, wrap the config with `createMDX`, add `mdx` to `pageExtensions`, and pass `remark-gfm` as a string in `remarkPlugins` so it works under Turbopack. Keep `output: "export"` and the unoptimized images setting.
- Add `src/mdx-components.tsx`. Next resolves the file at the project root or inside `src/` when `src/` is used, which this project does. It must export a single function named `useMDXComponents`, taking no arguments, that returns the element map below.

## Routes and components

- `src/app/writing/page.tsx`: index. Heading "Writing" in the page H1 style. Lists `posts` sorted by `published` descending, each rendered with `PostListItem`. Metadata title "Writing".
- `src/app/writing/[slug]/page.tsx`: dynamic route. `generateStaticParams` returns one entry per registry slug. `dynamicParams = false` so unknown slugs 404. `generateMetadata` returns the post's title and description. The page looks up the post by slug, imports `@/content/writing/${slug}.mdx`, and renders `PostHeader` followed by the MDX body.
- `src/components/PostHeader.tsx`: title as H1 in the page style, published date beneath it. `src/lib/dates.ts` only formats year-month values, so add `formatDate(iso: string)` there, using `Intl.DateTimeFormat` in UTC like `formatMonth`, producing e.g. "Oct 9, 2026", with a test alongside the existing ones.
- `src/components/PostListItem.tsx`: title linking to the post, date, description.
- `src/components/NavLinks.tsx`: add `{ href: "/writing", label: "Writing" }` between About and Resume.

## Element map in `mdx-components.tsx`

Map these elements to styled versions using existing theme tokens; no new colors:

- `h2`: the site's section heading style with the `#` prefix, as used on the home page.
- `p`: `max-w-prose text-sm leading-relaxed`, matching the home page bio.
- `strong`: `font-semibold text-foreground`.
- `ol` and `li`: decimal list with the same text size and leading as paragraphs.
- `table`, `thead`, `th`, `td`: full-width table with `border-border` borders, `text-muted-foreground` header, small text, cell padding. Horizontal scroll wrapper on narrow screens.
- `a`: `text-primary hover:underline`, matching existing links.

Other elements fall through to defaults until a post needs them.

## Testing

- `src/data/posts.test.ts` as described under Data.
- `src/components/NavLinks.test.tsx`: add a case that Writing renders and is active for `/writing` and `/writing/some-slug`.
- `src/components/PostHeader.test.tsx` and `src/components/PostListItem.test.tsx`: render tests with Testing Library, matching existing component tests.
- The MDX pipeline is verified by `npm run build`; `npm run deploy` already runs typecheck, lint, tests, then build.

## Error handling

- Unknown slug: 404 via `dynamicParams = false`.
- Registry entry with no MDX file: the data test fails, and the build fails on the import.
- MDX file with no registry entry: not routed and not listed, but still compiled, because the dynamic import in the post route makes the bundler include every file under src/content/writing/. A draft with an MDX syntax error there breaks the build, so keep unpublished drafts in docs/drafts/ until they are ready.

## Done when

- `/writing` lists the post and `/writing/fast-validation-for-ai-driven-development` renders it with the table, both in light and dark theme, with the Writing nav item active.
- `npm run check` and `npm run build` pass.
- The LinkedIn post file exists with the canonical URL.
