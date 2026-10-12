// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import * as worker from "./index";
import { firstLanguage, handleRequest, isTrackable, pageViewFrom, pageViewFromPing, parsePing } from "./index";
import { PING_PATH } from "./ping-path";
import type { Provider } from "./provider";

const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";
const CRAWLER = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const LINKEDIN_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]";

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

  it("tracks LinkedIn's in-app browser, where most recruiter clicks land", () => {
    expect(isTrackable(documentRequest("/", { headers: { "User-Agent": LINKEDIN_APP } }), ok)).toBe(true);
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

  it("still returns the asset response when tracking rejects in the background", async () => {
    const { env, assetResponse } = stubEnv();
    const { ctx, pending } = stubCtx();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider: Provider = {
      track: () => Promise.reject(new Error("boom")),
    };

    const response = await handleRequest(documentRequest("/"), env, ctx, provider);
    await Promise.all(pending);

    expect(response).toBe(assetResponse);
    expect(error).toHaveBeenCalledOnce();
  });
});

function pingRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://ghaws.dev${PING_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": BROWSER,
      "CF-Connecting-IP": "203.0.113.7",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** An ASSETS stub whose HEAD for `/missing` is a 404 and everything else a 200. */
function stubEnvWithPages() {
  const fetch = vi.fn(async (input: Request | string) => {
    const request = input instanceof Request ? input : new Request(input);
    const status = new URL(request.url).pathname === "/missing" ? 404 : 200;
    return new Response(request.method === "HEAD" ? null : "<html></html>", { status });
  });
  return { ASSETS: { fetch } } as unknown as Env;
}

const ORIGIN = "https://ghaws.dev";

describe("parsePing", () => {
  it("accepts a path with an optional referrer and returns the resolved path and query", () => {
    expect(parsePing({ url: "/writing?x=1", referrer: "https://ghaws.dev/" }, ORIGIN)).toEqual({
      url: "/writing?x=1",
      referrer: "https://ghaws.dev/",
    });
    expect(parsePing({ url: "/writing" }, ORIGIN)).toEqual({ url: "/writing", referrer: null });
    expect(parsePing({ url: "/writing", referrer: "" }, ORIGIN)).toEqual({ url: "/writing", referrer: null });
    expect(parsePing({ url: "/writing/../resume" }, ORIGIN)).toEqual({ url: "/resume", referrer: null });
  });

  it("rejects bodies that are not an object with a same-origin path", () => {
    expect(parsePing(null, ORIGIN)).toBeNull();
    expect(parsePing("/writing", ORIGIN)).toBeNull();
    expect(parsePing({}, ORIGIN)).toBeNull();
    expect(parsePing({ url: "writing" }, ORIGIN)).toBeNull();
    expect(parsePing({ url: "https://evil.example/" }, ORIGIN)).toBeNull();
    expect(parsePing({ url: "//evil.example/" }, ORIGIN)).toBeNull();
    // The WHATWG parser reads a backslash as a slash for https, so this is "//evil.example/" in disguise.
    expect(parsePing({ url: "/\\evil.example/" }, ORIGIN)).toBeNull();
    expect(parsePing({ url: `/${"a".repeat(2000)}` }, ORIGIN)).toBeNull();
    expect(parsePing({ url: "/writing", referrer: 42 }, ORIGIN)).toBeNull();
    expect(parsePing({ url: "/writing", referrer: "h".repeat(2001) }, ORIGIN)).toBeNull();
  });
});

describe("pageViewFromPing", () => {
  it("combines the ping body with the request headers", () => {
    const request = pingRequest({}, { "Accept-Language": "de-DE,de;q=0.9" });
    expect(pageViewFromPing(request, { url: "/writing?x=1", referrer: "https://ghaws.dev/" })).toEqual({
      url: "https://ghaws.dev/writing?x=1",
      hostname: "ghaws.dev",
      referrer: "https://ghaws.dev/",
      userAgent: BROWSER,
      ip: "203.0.113.7",
      language: "de-DE",
    });
  });
});

describe("handleRequest for POST /nav", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 204 at once, then confirms the page exists and tracks it in the background", async () => {
    const env = stubEnvWithPages();
    const { ctx, pending } = stubCtx();
    const { provider, views } = recordingProvider();

    const response = await handleRequest(
      pingRequest({ url: "/writing", referrer: "https://ghaws.dev/" }),
      env,
      ctx,
      provider,
    );

    expect(response.status).toBe(204);
    expect(ctx.waitUntil).toHaveBeenCalledOnce();
    await Promise.all(pending);
    const headCall = (env.ASSETS.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Request;
    expect(headCall.method).toBe("HEAD");
    expect(new URL(headCall.url).pathname).toBe("/writing");
    expect(views).toEqual([
      expect.objectContaining({ url: "https://ghaws.dev/writing", referrer: "https://ghaws.dev/" }),
    ]);
  });

  it("returns 400 for an invalid body", async () => {
    const env = stubEnvWithPages();
    const { ctx } = stubCtx();
    const { provider, views } = recordingProvider();

    expect((await handleRequest(pingRequest("not json"), env, ctx, provider)).status).toBe(400);
    expect((await handleRequest(pingRequest({ url: "nope" }), env, ctx, provider)).status).toBe(400);
    expect((await handleRequest(pingRequest({ url: "/\\evil.example/" }), env, ctx, provider)).status).toBe(400);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(views).toEqual([]);
  });

  it("does not track a page that is not in the assets", async () => {
    const env = stubEnvWithPages();
    const { ctx, pending } = stubCtx();
    const { provider, views } = recordingProvider();

    const response = await handleRequest(pingRequest({ url: "/missing" }), env, ctx, provider);

    expect(response.status).toBe(204);
    await Promise.all(pending);
    expect(views).toEqual([]);
  });

  it("returns 204 without any background work for a cross-site post or a bot", async () => {
    const env = stubEnvWithPages();
    const { ctx } = stubCtx();
    const { provider, views } = recordingProvider();

    const crossSite = await handleRequest(
      pingRequest({ url: "/writing" }, { "Sec-Fetch-Site": "cross-site" }),
      env,
      ctx,
      provider,
    );
    const bot = await handleRequest(
      pingRequest({ url: "/writing" }, { "User-Agent": CRAWLER }),
      env,
      ctx,
      provider,
    );

    expect([crossSite.status, bot.status]).toEqual([204, 204]);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    expect(views).toEqual([]);
  });

  it("serves a GET to the ping path from the assets like any other path", async () => {
    const { env, assetResponse } = stubEnv(404);
    const { ctx } = stubCtx();
    const { provider } = recordingProvider();

    const response = await handleRequest(documentRequest(PING_PATH), env, ctx, provider);

    expect(response).toBe(assetResponse);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });
});

describe("module exports", () => {
  it("exports only functions besides the default handler, as workerd requires of the main module", () => {
    for (const [name, value] of Object.entries(worker)) {
      if (name !== "default") expect(typeof value, name).toBe("function");
    }
  });
});
