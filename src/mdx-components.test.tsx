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

  it("underlines prose links so colour is not the only cue", () => {
    const A = components.a!;
    render(<A href="/x">Go</A>);
    expect(screen.getByRole("link", { name: "Go" })).toHaveClass("text-primary", "underline");
  });

  it("wraps tables in a keyboard-reachable scroll region", () => {
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
    const region = screen.getByRole("region", { name: "Scrollable table" });
    expect(region).toHaveClass("overflow-x-auto");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(table);
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
