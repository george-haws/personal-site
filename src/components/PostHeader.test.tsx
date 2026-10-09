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
