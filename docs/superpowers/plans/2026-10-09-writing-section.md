# Writing Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Writing section at `/writing` with MDX posts at `/writing/<slug>`, and publish the fast-validation post as the first entry.

**Architecture:** Post metadata lives in a TypeScript registry (`src/data/posts.ts`), matching how projects and the resume are data-driven. Post bodies are MDX files in `src/content/writing/`, compiled by `@next/mdx` with `remark-gfm` and styled by an element map in `src/mdx-components.tsx`. A dynamic route imports the MDX file by slug and is statically generated from the registry, so the site stays a static export.

**Tech Stack:** Next.js 16 App Router (static export), `@next/mdx`, `remark-gfm`, Tailwind 4 with the site's theme tokens, Vitest with Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-writing-section-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/02-guides/mdx.md` before touching MDX config; this Next version differs from training data.
- `next.config.ts` must keep `output: "export"` and `images: { unoptimized: true }`.
- remark plugins are passed to `createMDX` **by name as strings** (Turbopack requirement), never as imported functions.
- `src/mdx-components.tsx` must export a single function `useMDXComponents()` taking no arguments.
- No new colors. Use only existing tokens: `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`, `bg-muted`.
- Nav order is About, Writing, Resume.
- Canonical post URL: `https://ghaws.dev/writing/fast-validation-for-ai-driven-development`.
- Run tests with `npm run test -- <path>`; run everything with `npm run check`.
- Commit after each task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/dates.ts` | Add `formatDate(iso)` for full dates |
| `src/lib/types.ts` | Add `Post` type |
| `src/data/posts.ts` | Registry of published posts |
| `src/data/posts.test.ts` | Registry invariants |
| `src/content/writing/fast-validation-for-ai-driven-development.mdx` | The post body |
| `next.config.ts` | MDX-wrapped config |
| `src/mdx-components.tsx` | Markdown element to styled element map |
| `src/mdx-components.test.tsx` | Element map renders with the expected classes |
| `src/components/PostHeader.tsx` | Title and date for a post page |
| `src/components/PostListItem.tsx` | One row on the index |
| `src/app/writing/page.tsx` | Index page |
| `src/app/writing/[slug]/page.tsx` | Post page |
| `src/components/NavLinks.tsx` | Add Writing |
| `docs/drafts/fast-validation-linkedin.md` | LinkedIn post text |

---

### Task 1: `formatDate` helper

**Files:**
- Modify: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Produces: `formatDate(iso: string): string` — takes `"YYYY-MM-DD"`, returns e.g. `"Oct 9, 2026"`. Used by Task 4.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/dates.test.ts`:

```ts
import { formatDate } from "@/lib/dates";

describe("formatDate", () => {
  it("formats an ISO date as short month, day, and year", () => {
    expect(formatDate("2026-10-09")).toBe("Oct 9, 2026");
    expect(formatDate("2025-01-31")).toBe("Jan 31, 2025");
  });
});
```

Merge the import into the existing import line: `import { formatMonth, formatDateRange, formatDate } from "@/lib/dates";`

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/dates.test.ts`
Expected: FAIL, `formatDate` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/dates.ts`:

```ts
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats an ISO date ("YYYY-MM-DD") as e.g. "Oct 9, 2026". */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/lib/dates.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "Add formatDate for full ISO dates

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Post type, registry, and content

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/data/posts.ts`
- Create: `src/content/writing/fast-validation-for-ai-driven-development.mdx` (moved from `docs/drafts/fast-validation-for-ai-driven-development.md`)
- Test: `src/data/posts.test.ts`

**Interfaces:**
- Produces: `type Post = { slug: string; title: string; description: string; published: string }` in `@/lib/types`, and `posts: Post[]` from `@/data/posts`. Used by Tasks 4, 5.

- [ ] **Step 1: Write the failing test**

Create `src/data/posts.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { posts } from "@/data/posts";

describe("posts", () => {
  it("has at least one post", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug, slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("has a parseable ISO date on every post", () => {
    for (const post of posts) {
      expect(post.published, post.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(post.published)), post.slug).toBe(false);
    }
  });

  it("has a title and description on every post", () => {
    for (const post of posts) {
      expect(post.title.trim().length, post.slug).toBeGreaterThan(0);
      expect(post.description.trim().length, post.slug).toBeGreaterThan(0);
    }
  });

  it("has an MDX file for every slug", () => {
    for (const post of posts) {
      const file = join(process.cwd(), "src", "content", "writing", `${post.slug}.mdx`);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/data/posts.test.ts`
Expected: FAIL, cannot resolve `@/data/posts`.

- [ ] **Step 3: Add the type**

Append to `src/lib/types.ts`:

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

- [ ] **Step 4: Add the registry**

Create `src/data/posts.ts`:

```ts
import type { Post } from "@/lib/types";

export const posts: Post[] = [
  {
    slug: "fast-validation-for-ai-driven-development",
    title: "Elevate the constraint: validation in the AI era",
    description:
      "AI made producing change cheap, so the constraint on delivery moved to validation. Projects need fast deterministic and judgment-based checks at every tier, or they get no acceleration or ship instability.",
    published: "2026-10-09",
  },
];
```

- [ ] **Step 5: Move the draft into content**

```bash
mkdir -p src/content/writing
git mv docs/drafts/fast-validation-for-ai-driven-development.md src/content/writing/fast-validation-for-ai-driven-development.mdx
```

Then delete the first two lines of the MDX file (the `# The bottleneck moved...` H1 and the blank line after it) so the file starts with `## The queue nobody budgeted for`. Verify:

```bash
head -1 src/content/writing/fast-validation-for-ai-driven-development.mdx
```

Expected: `## The queue nobody budgeted for`

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test -- src/data/posts.test.ts`
Expected: PASS, five cases.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/data/posts.ts src/data/posts.test.ts src/content/writing docs/drafts
git commit -m "Add the post registry and move the fast validation post into content

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: MDX pipeline and element map

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `next.config.ts`
- Create: `src/mdx-components.tsx`
- Test: `src/mdx-components.test.tsx`

**Interfaces:**
- Produces: `useMDXComponents(): MDXComponents` in `src/mdx-components.tsx`, picked up by Next automatically. `*.mdx` modules become importable with a React component default export (types from `@types/mdx`). Used by Task 5.

- [ ] **Step 1: Install dependencies**

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react @types/mdx remark-gfm
```

Expected: `package.json` lists all five under `dependencies`.

- [ ] **Step 2: Wrap the Next config**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  pageExtensions: ["ts", "tsx", "mdx"],
};

const withMDX = createMDX({
  options: {
    // Plugins by name as strings so they work under Turbopack.
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
```

- [ ] **Step 3: Write the failing element-map test**

Create `src/mdx-components.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMDXComponents } from "@/mdx-components";

describe("useMDXComponents", () => {
  const components = useMDXComponents();

  it("styles h2 as a site section heading", () => {
    const H2 = components.h2!;
    render(<H2>Section</H2>);
    const heading = screen.getByRole("heading", { level: 2, name: "Section" });
    expect(heading).toHaveClass("text-lg", "font-medium", "text-foreground");
  });

  it("styles paragraphs at the site's prose measure", () => {
    const P = components.p!;
    render(<P>Body text</P>);
    expect(screen.getByText("Body text")).toHaveClass("max-w-prose", "text-sm", "leading-relaxed");
  });

  it("styles links like the rest of the site", () => {
    const A = components.a!;
    render(<A href="/x">Go</A>);
    expect(screen.getByRole("link", { name: "Go" })).toHaveClass("text-primary", "hover:underline");
  });

  it("wraps tables so they can scroll on narrow screens", () => {
    const Table = components.table!;
    render(
      <Table>
        <tbody>
          <tr>
            <td>cell</td>
          </tr>
        </tbody>
      </Table>,
    );
    const table = screen.getByRole("table");
    expect(table).toHaveClass("w-full", "text-sm");
    expect(table.parentElement).toHaveClass("overflow-x-auto");
  });

  it("styles table headers and cells with theme borders", () => {
    const Th = components.th!;
    const Td = components.td!;
    render(
      <table>
        <thead>
          <tr>
            <Th>Head</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>Cell</Td>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByRole("columnheader", { name: "Head" })).toHaveClass("border-border", "text-muted-foreground");
    expect(screen.getByRole("cell", { name: "Cell" })).toHaveClass("border-border");
  });

  it("styles ordered lists with decimal markers", () => {
    const Ol = components.ol!;
    const Li = components.li!;
    render(
      <Ol>
        <Li>One</Li>
      </Ol>,
    );
    expect(screen.getByRole("list")).toHaveClass("list-decimal");
    expect(screen.getByRole("listitem")).toHaveClass("text-sm", "leading-relaxed");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test -- src/mdx-components.test.tsx`
Expected: FAIL, cannot resolve `@/mdx-components`.

- [ ] **Step 5: Write the element map**

Create `src/mdx-components.tsx`:

```tsx
import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

const components: MDXComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-10 text-lg font-medium text-foreground before:mr-2 before:text-primary before:content-['#']"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-4 max-w-prose text-sm leading-relaxed" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a className="text-primary hover:underline" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-4 max-w-prose list-decimal space-y-2 pl-6" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="text-sm leading-relaxed" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="border border-border bg-muted px-3 py-2 text-left align-top font-medium text-muted-foreground"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border border-border px-3 py-2 align-top" {...props} />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test -- src/mdx-components.test.tsx`
Expected: PASS, six cases.

- [ ] **Step 7: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean. If `tsc` cannot find types for `*.mdx`, confirm `@types/mdx` is installed; it declares the module.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.ts src/mdx-components.tsx src/mdx-components.test.tsx
git commit -m "Add the MDX pipeline with remark-gfm and a themed element map

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: PostHeader and PostListItem components

**Files:**
- Create: `src/components/PostHeader.tsx`
- Create: `src/components/PostListItem.tsx`
- Test: `src/components/PostHeader.test.tsx`
- Test: `src/components/PostListItem.test.tsx`

**Interfaces:**
- Consumes: `Post` from `@/lib/types` (Task 2), `formatDate` from `@/lib/dates` (Task 1).
- Produces: `PostHeader({ post }: { post: Post })` and `PostListItem({ post }: { post: Post })`. Used by Task 5.

- [ ] **Step 1: Write the failing tests**

Create `src/components/PostHeader.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PostHeader } from "@/components/PostHeader";
import type { Post } from "@/lib/types";

const post: Post = {
  slug: "hello",
  title: "Hello world",
  description: "First post.",
  published: "2026-10-09",
};

describe("PostHeader", () => {
  it("renders the title as the page heading", () => {
    render(<PostHeader post={post} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hello world" })).toBeInTheDocument();
  });

  it("renders the published date as a time element", () => {
    render(<PostHeader post={post} />);
    const time = screen.getByText("Oct 9, 2026");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-10-09");
  });
});
```

Create `src/components/PostListItem.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PostListItem } from "@/components/PostListItem";
import type { Post } from "@/lib/types";

const post: Post = {
  slug: "hello",
  title: "Hello world",
  description: "First post.",
  published: "2026-10-09",
};

describe("PostListItem", () => {
  it("links the title to the post", () => {
    render(<PostListItem post={post} />);
    expect(screen.getByRole("link", { name: "Hello world" })).toHaveAttribute("href", "/writing/hello");
  });

  it("shows the date and description", () => {
    render(<PostListItem post={post} />);
    expect(screen.getByText("Oct 9, 2026")).toHaveAttribute("datetime", "2026-10-09");
    expect(screen.getByText("First post.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/components/PostHeader.test.tsx src/components/PostListItem.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the components**

Create `src/components/PostHeader.tsx`:

```tsx
import { formatDate } from "@/lib/dates";
import type { Post } from "@/lib/types";

export function PostHeader({ post }: { post: Post }) {
  return (
    <hgroup className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
        {post.title}
      </h1>
      <time dateTime={post.published} className="text-sm text-muted-foreground">
        {formatDate(post.published)}
      </time>
    </hgroup>
  );
}
```

Create `src/components/PostListItem.tsx`:

```tsx
import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { Post } from "@/lib/types";

export function PostListItem({ post }: { post: Post }) {
  return (
    <li className="flex flex-col gap-1">
      <Link href={`/writing/${post.slug}`} className="font-medium text-primary hover:underline">
        {post.title}
      </Link>
      <time dateTime={post.published} className="text-xs text-muted-foreground">
        {formatDate(post.published)}
      </time>
      <p className="max-w-prose text-sm text-muted-foreground">{post.description}</p>
    </li>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/components/PostHeader.test.tsx src/components/PostListItem.test.tsx`
Expected: PASS, four cases.

- [ ] **Step 5: Commit**

```bash
git add src/components/PostHeader.tsx src/components/PostHeader.test.tsx src/components/PostListItem.tsx src/components/PostListItem.test.tsx
git commit -m "Add PostHeader and PostListItem components

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Writing index and post routes

**Files:**
- Create: `src/app/writing/page.tsx`
- Create: `src/app/writing/[slug]/page.tsx`
- Test: `src/app/writing/page.test.tsx`

**Interfaces:**
- Consumes: `posts` (Task 2), `PostHeader`, `PostListItem` (Task 4), MDX imports (Task 3).
- Produces: routes `/writing` and `/writing/<slug>` in the static export.

- [ ] **Step 1: Write the failing index test**

Create `src/app/writing/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WritingPage from "@/app/writing/page";

describe("WritingPage", () => {
  it("has a Writing heading", () => {
    render(<WritingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Writing" })).toBeInTheDocument();
  });

  it("links to the fast validation post", () => {
    render(<WritingPage />);
    expect(
      screen.getByRole("link", { name: "Elevate the constraint: validation in the AI era" }),
    ).toHaveAttribute("href", "/writing/fast-validation-for-ai-driven-development");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/app/writing/page.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the index page**

Create `src/app/writing/page.tsx`:

```tsx
import type { Metadata } from "next";
import { PostListItem } from "@/components/PostListItem";
import { posts } from "@/data/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Posts on engineering, validation, and AI-driven development.",
};

export default function WritingPage() {
  const sorted = [...posts].sort((a, b) => b.published.localeCompare(a.published));

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
        Writing
      </h1>
      <ul className="mt-6 flex flex-col gap-6">
        {sorted.map((post) => (
          <PostListItem key={post.slug} post={post} />
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/app/writing/page.test.tsx`
Expected: PASS, two cases.

- [ ] **Step 5: Write the post page**

Create `src/app/writing/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostHeader } from "@/components/PostHeader";
import { posts } from "@/data/posts";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const { default: Body } = await import(`@/content/writing/${slug}.mdx`);

  return (
    <article>
      <PostHeader post={post} />
      <div className="mt-8">
        <Body />
      </div>
    </article>
  );
}
```

- [ ] **Step 6: Build and inspect the output**

Run: `npm run build`
Expected: build succeeds and lists `/writing` and `/writing/fast-validation-for-ai-driven-development` as static routes.

Then:

```bash
ls out/writing out/writing/fast-validation-for-ai-driven-development
grep -c "<table" out/writing/fast-validation-for-ai-driven-development/index.html
grep -o "<title>[^<]*</title>" out/writing/fast-validation-for-ai-driven-development/index.html
```

Expected: `index.html` exists in both directories; the table count is `1`; the title is `Elevate the constraint: validation in the AI era · George Haws`.

If the build fails on the dynamic import, confirm the import path ends in `.mdx` and `pageExtensions` includes `mdx` (Task 3).

- [ ] **Step 7: Check it in the browser**

Run `npm run dev`, open `http://localhost:3000/writing` and the post. Confirm the table renders with borders, the H2s carry the `#` prefix, and both look right after toggling the theme. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/app/writing
git commit -m "Add the writing index and post routes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Writing in the nav

**Files:**
- Modify: `src/components/NavLinks.tsx:4-7`
- Test: `src/components/NavLinks.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/components/NavLinks.test.tsx`, replace the first test and add two more:

```tsx
  it("renders the three routes", () => {
    render(<NavLinks currentPath="/" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Writing" })).toHaveAttribute("href", "/writing");
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/resume");
  });

  it("orders the links About, Writing, Resume", () => {
    render(<NavLinks currentPath="/" />);
    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(labels).toEqual(["About", "Writing", "Resume"]);
  });

  it("marks the writing link current on a post page", () => {
    render(<NavLinks currentPath="/writing/some-slug" />);
    expect(screen.getByRole("link", { name: "Writing" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/components/NavLinks.test.tsx`
Expected: FAIL, no link named Writing.

- [ ] **Step 3: Add the nav item**

In `src/components/NavLinks.tsx`, change `navItems` to:

```ts
const navItems = [
  { href: "/", label: "About" },
  { href: "/writing", label: "Writing" },
  { href: "/resume", label: "Resume" },
] as const;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/components/NavLinks.test.tsx`
Expected: PASS, all cases including the existing ones.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavLinks.tsx src/components/NavLinks.test.tsx
git commit -m "Add Writing to the nav

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: LinkedIn post and final check

**Files:**
- Create: `docs/drafts/fast-validation-linkedin.md`

- [ ] **Step 1: Write the LinkedIn post**

Create `docs/drafts/fast-validation-linkedin.md`:

```md
An agent can produce a plausible change in four minutes. If confirming it is right takes four days, you have not accelerated anything. You have moved the wait.

I wrote up what happens when teams adopt AI coding tools without speeding up validation. Either the review queue eats the gain, or validation gets thinned and releases get unstable.

The post lays out the two kinds of checks every project needs, deterministic and judgment-based, and what "fast" means at the agent loop, the pull request, and the release. It also covers the one benchmark I ran on a design-system review skill: the agent's unaided review caught 20 to 40 percent of the problems, and with the skill it caught all of them.

https://ghaws.dev/writing/fast-validation-for-ai-driven-development
```

- [ ] **Step 2: Run the full check and build**

Run: `npm run check && npm run build`
Expected: typecheck, lint, all tests, and build pass.

- [ ] **Step 3: Commit**

```bash
git add docs/drafts/fast-validation-linkedin.md
git commit -m "Add the LinkedIn post for the fast validation article

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 4: Deploy is a separate decision**

Do not run `npm run deploy`. Report that the branch is ready and let George decide when to publish.
