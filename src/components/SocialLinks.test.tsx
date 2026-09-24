import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SocialLinks } from "@/components/SocialLinks";

describe("SocialLinks", () => {
  it("renders only the links that are present", () => {
    render(<SocialLinks links={{ github: "https://github.com/x" }} />);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/x");
    expect(screen.queryByRole("link", { name: "LinkedIn" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Email" })).toBeNull();
  });

  it("renders email as a mailto link", () => {
    render(<SocialLinks links={{ email: "me@example.com" }} />);
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:me@example.com");
  });

  it("renders nothing when there are no links", () => {
    const { container } = render(<SocialLinks links={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
