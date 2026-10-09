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
