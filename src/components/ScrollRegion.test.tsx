import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { ScrollRegion } from "@/components/ScrollRegion";

/** jsdom has no layout, so fake the scroll geometry of the region. */
function fakeGeometry(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => scrollWidth });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => clientWidth });
}

afterEach(() => {
  delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe("ScrollRegion", () => {
  it("is a keyboard-reachable region named by its label", () => {
    fakeGeometry(100, 100);
    render(
      <ScrollRegion label="Sample output">
        <pre>hello</pre>
      </ScrollRegion>,
    );
    const region = screen.getByRole("region", { name: "Sample output" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveTextContent("hello");
  });

  it("renders no data-overflow on the server, so clients can wait for a measurement", () => {
    const html = renderToStaticMarkup(
      <ScrollRegion label="Sample output">
        <pre>hello</pre>
      </ScrollRegion>,
    );
    expect(html).toContain('role="region"');
    expect(html).not.toContain("data-overflow");
  });

  it("shows no fade when the content fits", () => {
    fakeGeometry(100, 100);
    render(
      <ScrollRegion label="Sample output">
        <pre>hello</pre>
      </ScrollRegion>,
    );
    expect(screen.getByRole("region")).toHaveAttribute("data-overflow", "false");
  });

  it("fades the trailing edge while there is more content to the right", () => {
    fakeGeometry(500, 300);
    render(
      <ScrollRegion label="Sample output">
        <pre>hello</pre>
      </ScrollRegion>,
    );
    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("data-overflow", "true");

    act(() => {
      region.scrollLeft = 200;
      fireEvent.scroll(region);
    });
    expect(region).toHaveAttribute("data-overflow", "false");
  });

  it("marks the fade so browser tests can find it", () => {
    fakeGeometry(100, 100);
    const { container } = render(
      <ScrollRegion label="Sample output">
        <pre>hello</pre>
      </ScrollRegion>,
    );
    expect(container.querySelector('[data-slot="scroll-fade"]')).not.toBeNull();
  });
});
