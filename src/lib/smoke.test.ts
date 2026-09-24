import { describe, it, expect } from "vitest";

describe("test toolchain", () => {
  it("runs in jsdom", () => {
    const el = document.createElement("div");
    el.textContent = "hello";
    expect(el).toHaveTextContent("hello");
  });
});
