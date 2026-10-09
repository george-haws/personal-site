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
