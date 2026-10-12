// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageView } from "../provider";
import { DEFAULT_UMAMI_ENDPOINT, umamiProvider } from "./umami";

const view: PageView = {
  url: "https://ghaws.dev/?utm_source=linkedin&utm_medium=message&utm_campaign=acme-staff-eng",
  hostname: "ghaws.dev",
  referrer: "https://www.linkedin.com/",
  userAgent: "Mozilla/5.0 (test)",
  ip: "203.0.113.7",
  language: "en-US",
};

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("umamiProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts the documented payload to the default endpoint", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));
    await umamiProvider({ websiteId: "site-1" }).track(view);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(DEFAULT_UMAMI_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (test)",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual({
      type: "event",
      payload: {
        website: "site-1",
        hostname: "ghaws.dev",
        url: "/?utm_source=linkedin&utm_medium=message&utm_campaign=acme-staff-eng",
        referrer: "https://www.linkedin.com/",
        language: "en-US",
        ip: "203.0.113.7",
        userAgent: "Mozilla/5.0 (test)",
      },
    });
  });

  it("uses a custom endpoint, sends an empty referrer, and omits a null language", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));
    await umamiProvider({ websiteId: "site-1", endpoint: "https://umami.example/api/send" }).track({
      ...view,
      referrer: null,
      language: null,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://umami.example/api/send");
    const { payload } = JSON.parse(init.body as string);
    expect(payload.referrer).toBe("");
    expect("language" in payload).toBe(false);
  });

  it("falls back to the default endpoint when the endpoint is empty", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));
    await umamiProvider({ websiteId: "site-1", endpoint: "" }).track(view);

    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(DEFAULT_UMAMI_ENDPOINT);
  });

  it("logs and resolves on a non-2xx response", async () => {
    stubFetch(new Response("nope", { status: 400 }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(umamiProvider({ websiteId: "site-1" }).track(view)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0][0])).toContain("400");
  });

  it("logs and resolves on a network error", async () => {
    stubFetch(new Error("connection reset"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(umamiProvider({ websiteId: "site-1" }).track(view)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });
});
