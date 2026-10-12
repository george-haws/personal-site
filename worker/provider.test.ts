// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProvider, noopProvider } from "./provider";

describe("createProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the no-op provider when the provider is unset or none", () => {
    expect(createProvider({})).toBe(noopProvider);
    expect(createProvider({ ANALYTICS_PROVIDER: "none" })).toBe(noopProvider);
  });

  it("returns an Umami provider when configured with a website ID", () => {
    const provider = createProvider({ ANALYTICS_PROVIDER: "umami", UMAMI_WEBSITE_ID: "site-1" });
    expect(provider).not.toBe(noopProvider);
    expect(typeof provider.track).toBe("function");
  });

  it("disables tracking and warns when the Umami website ID is empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createProvider({ ANALYTICS_PROVIDER: "umami", UMAMI_WEBSITE_ID: "" })).toBe(noopProvider);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to the no-op provider for an unknown name and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createProvider({ ANALYTICS_PROVIDER: "bogus" })).toBe(noopProvider);
    expect(createProvider({ ANALYTICS_PROVIDER: "bogus" })).toBe(noopProvider);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("noopProvider", () => {
  it("resolves without doing anything", async () => {
    await expect(
      noopProvider.track({
        url: "https://ghaws.dev/",
        hostname: "ghaws.dev",
        referrer: null,
        userAgent: "ua",
        ip: "203.0.113.7",
        language: null,
      }),
    ).resolves.toBeUndefined();
  });
});
