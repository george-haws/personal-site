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
