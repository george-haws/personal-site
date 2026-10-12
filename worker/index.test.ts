// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { firstLanguage, handleRequest, isTrackable, pageViewFrom } from "./index";
import type { Provider } from "./provider";

const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";
const CRAWLER = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function documentRequest(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new Request(`https://ghaws.dev${path}`, {
    method: init.method ?? "GET",
    headers: { "Sec-Fetch-Dest": "document", "User-Agent": BROWSER, ...init.headers },
  });
}

function stubEnv(assetStatus = 200) {
  const assetResponse = new Response("<html></html>", {
    status: assetStatus,
    headers: { "content-type": "text/html" },
  });
  return {
    env: { ASSETS: { fetch: vi.fn(async () => assetResponse) } } as unknown as Env,
    assetResponse,
  };
}

function stubCtx() {
  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      pending.push(promise);
    }),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
  return { ctx, pending };
}

function recordingProvider() {
  const views: unknown[] = [];
  const provider: Provider = {
    async track(view) {
      views.push(view);
    },
  };
  return { provider, views };
}

describe("firstLanguage", () => {
  it("takes the first tag and drops its weight", () => {
    expect(firstLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en-US");
    expect(firstLanguage("fr;q=0.8")).toBe("fr");
  });

  it("caps an oversized tag at 35 characters", () => {
    expect(firstLanguage("x".repeat(60))).toBe("x".repeat(35));
  });

  it("returns null for a missing or empty header", () => {
    expect(firstLanguage(null)).toBeNull();
    expect(firstLanguage("")).toBeNull();
    expect(firstLanguage(" , ")).toBeNull();
  });
});

describe("isTrackable", () => {
  const ok = new Response("", { status: 200 });
  const notModified = new Response(null, { status: 304 });
  const notFound = new Response("", { status: 404 });

  it("tracks a document GET served with 200 or 304", () => {
    expect(isTrackable(documentRequest("/"), ok)).toBe(true);
    expect(isTrackable(documentRequest("/writing"), notModified)).toBe(true);
  });

  it("tracks the resume PDF even when it is not a document navigation", () => {
    const request = new Request("https://ghaws.dev/resume.pdf", {
      headers: { "Sec-Fetch-Dest": "empty", "User-Agent": BROWSER },
    });
    expect(isTrackable(request, ok)).toBe(true);
  });

  it("falls back to the Accept header when Sec-Fetch-Dest is absent", () => {
    const html = new Request("https://ghaws.dev/", {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": BROWSER },
    });
    const json = new Request("https://ghaws.dev/", {
      headers: { Accept: "application/json", "User-Agent": BROWSER },
    });
    expect(isTrackable(html, ok)).toBe(true);
    expect(isTrackable(json, ok)).toBe(false);
  });

  it("does not track non-document fetches such as RSC payloads", () => {
    const rsc = new Request("https://ghaws.dev/writing.txt?_rsc=1", {
      headers: { "Sec-Fetch-Dest": "empty", "User-Agent": BROWSER },
    });
    expect(isTrackable(rsc, ok)).toBe(false);
  });

  it("does not track Next build output, non-GET requests, or missing pages", () => {
    expect(isTrackable(documentRequest("/_next/static/chunk.js"), ok)).toBe(false);
    expect(isTrackable(documentRequest("/", { method: "POST" }), ok)).toBe(false);
    expect(isTrackable(documentRequest("/nope"), notFound)).toBe(false);
  });

  it("does not track prefetch or prerender document requests", () => {
    expect(isTrackable(documentRequest("/", { headers: { "Sec-Purpose": "prefetch" } }), ok)).toBe(false);
    expect(isTrackable(documentRequest("/", { headers: { "Sec-Purpose": "prefetch;prerender" } }), ok)).toBe(false);
    expect(isTrackable(documentRequest("/", { headers: { Purpose: "prefetch" } }), ok)).toBe(false);
  });

  it("does not track bots or requests without a user agent", () => {
    expect(isTrackable(documentRequest("/", { headers: { "User-Agent": CRAWLER } }), ok)).toBe(false);
    const anonymous = new Request("https://ghaws.dev/", { headers: { "Sec-Fetch-Dest": "document" } });
    expect(isTrackable(anonymous, ok)).toBe(false);
  });
});

describe("pageViewFrom", () => {
  it("builds the record from the request and its headers", () => {
    const request = documentRequest("/writing/post?utm_source=linkedin", {
      headers: {
        "CF-Connecting-IP": "203.0.113.7",
        Referer: "https://www.linkedin.com/",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    expect(pageViewFrom(request)).toEqual({
      url: "https://ghaws.dev/writing/post?utm_source=linkedin",
      hostname: "ghaws.dev",
      referrer: "https://www.linkedin.com/",
      userAgent: BROWSER,
      ip: "203.0.113.7",
      language: "en-US",
    });
  });

  it("uses null for an absent referrer and language", () => {
    const view = pageViewFrom(documentRequest("/"));
    expect(view.referrer).toBeNull();
    expect(view.language).toBeNull();
    expect(view.ip).toBe("");
  });
});

describe("handleRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the asset response unchanged and tracks a document load in the background", async () => {
    const { env, assetResponse } = stubEnv();
    const { ctx, pending } = stubCtx();
    const { provider, views } = recordingProvider();
    const request = documentRequest("/", { headers: { "CF-Connecting-IP": "203.0.113.7" } });

    const response = await handleRequest(request, env, ctx, provider);

    expect(response).toBe(assetResponse);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
    expect(ctx.waitUntil).toHaveBeenCalledOnce();
    await Promise.all(pending);
    expect(views).toEqual([expect.objectContaining({ url: "https://ghaws.dev/", ip: "203.0.113.7" })]);
  });

  it("does not track an untrackable request", async () => {
    const { env, assetResponse } = stubEnv(404);
    const { ctx } = stubCtx();
    const { provider, views } = recordingProvider();

    const response = await handleRequest(documentRequest("/nope"), env, ctx, provider);

    expect(response).toBe(assetResponse);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(views).toEqual([]);
  });

  it("still returns the asset response when tracking throws", async () => {
    const { env, assetResponse } = stubEnv();
    const { ctx } = stubCtx();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider: Provider = {
      track() {
        throw new Error("boom");
      },
    };

    const response = await handleRequest(documentRequest("/"), env, ctx, provider);

    expect(response).toBe(assetResponse);
    expect(error).toHaveBeenCalledOnce();
  });
});
