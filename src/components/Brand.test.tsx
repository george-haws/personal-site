import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Brand } from "@/components/Brand";
import { site } from "@/data/site";

describe("Brand", () => {
  it("links home and is named after the site at every width", () => {
    render(<Brand />);
    expect(screen.getByRole("link", { name: site.name })).toHaveAttribute("href", "/");
  });

  it("carries both the short mark and the full name", () => {
    render(<Brand />);
    expect(screen.getByText("g_")).toBeInTheDocument();
    expect(screen.getByText(site.name)).toBeInTheDocument();
  });
});
