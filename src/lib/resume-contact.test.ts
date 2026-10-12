import { describe, it, expect } from "vitest";
import { contactItems, displayUrl } from "@/lib/resume-contact";
import type { SiteInfo } from "@/lib/types";

const site: SiteInfo = {
  name: "Ada Lovelace",
  tagline: "Tagline.",
  bio: "Bio.",
  location: "London",
  url: "https://ada.dev",
  links: {
    email: "ada@ada.dev",
    github: "https://github.com/ada",
    linkedin: "https://www.linkedin.com/in/ada/",
  },
};

describe("displayUrl", () => {
  it("strips the protocol, a leading www., and a trailing slash", () => {
    expect(displayUrl("https://www.linkedin.com/in/ada/")).toBe("linkedin.com/in/ada");
    expect(displayUrl("https://github.com/ada")).toBe("github.com/ada");
    expect(displayUrl("https://ada.dev")).toBe("ada.dev");
  });

  it("leaves a bare host alone", () => {
    expect(displayUrl("ada.dev")).toBe("ada.dev");
  });
});

describe("contactItems", () => {
  it("lists location, email, site, GitHub, and LinkedIn in order, tagging the site link", () => {
    expect(contactItems(site, "pdf")).toEqual([
      { text: "London" },
      { text: "ada@ada.dev", href: "mailto:ada@ada.dev" },
      { text: "ada.dev", href: "https://ada.dev/?utm_source=resume&utm_medium=pdf" },
      { text: "github.com/ada", href: "https://github.com/ada" },
      { text: "linkedin.com/in/ada", href: "https://www.linkedin.com/in/ada/" },
    ]);
  });

  it("tags the site link with the markdown medium", () => {
    const siteItem = contactItems(site, "markdown").find((item) => item.text === "ada.dev");
    expect(siteItem?.href).toBe("https://ada.dev/?utm_source=resume&utm_medium=markdown");
  });

  it("does not double a trailing slash on the site URL", () => {
    const siteItem = contactItems({ ...site, url: "https://ada.dev/" }, "pdf").find(
      (item) => item.text === "ada.dev",
    );
    expect(siteItem?.href).toBe("https://ada.dev/?utm_source=resume&utm_medium=pdf");
  });

  it("omits links that are absent", () => {
    const items = contactItems({ ...site, links: { email: "ada@ada.dev" } }, "pdf");
    expect(items.map((item) => item.text)).toEqual(["London", "ada@ada.dev", "ada.dev"]);
  });
});
