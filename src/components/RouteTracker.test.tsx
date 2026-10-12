import { render } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteTracker } from "@/components/RouteTracker";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("RouteTracker", () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(usePathname).mockReturnValue("/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends nothing on the initial render", () => {
    render(<RouteTracker />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the new path and the previous page when the pathname changes", () => {
    const landing = window.location.href;
    const { rerender } = render(<RouteTracker />);

    vi.mocked(usePathname).mockReturnValue("/writing");
    rerender(<RouteTracker />);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/nav");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ url: "/writing", referrer: landing });
  });

  it("sends nothing on a re-render with the same pathname", () => {
    const { rerender } = render(<RouteTracker />);
    rerender(<RouteTracker />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders nothing", () => {
    const { container } = render(<RouteTracker />);
    expect(container).toBeEmptyDOMElement();
  });
});
