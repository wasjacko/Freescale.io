import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

function cssBlock(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

describe("Mue panel layout stability", () => {
  it("contains Ask Mue answers so long output cannot distort the app chrome", async () => {
    const css = await source("../app/globals.css");
    const pane = cssBlock(css, ".mue-pane");
    const wrap = cssBlock(css, ".mue-chat-wrap");
    const log = cssBlock(css, ".mue-chat-log");
    const bubble = cssBlock(css, ".mue-chat-bubble");
    const form = cssBlock(css, ".mue-ask-form");

    expect(pane).toContain("min-width: 0");
    expect(pane).toContain("contain: layout paint");
    expect(wrap).toContain("min-width: 0");
    expect(wrap).toContain("overflow: hidden");
    expect(log).toContain("overflow-y: auto");
    expect(log).toContain("overscroll-behavior: contain");
    expect(bubble).toContain("overflow-wrap: anywhere");
    expect(bubble).toContain("word-break: break-word");
    expect(form).toContain("min-width: 0");
  });

  it("keeps inline thread Mue results inside the visible thread area", async () => {
    const css = await source("../app/globals.css");
    const bar = cssBlock(css, ".thread-ai-bar");
    const result = cssBlock(css, ".thread-ai-result");
    const suggestions = cssBlock(css, ".mue-suggestions");

    expect(bar).toContain("min-width: 0");
    expect(result).toContain("max-height: min(360px, 42vh)");
    expect(result).toContain("overflow-y: auto");
    expect(result).toContain("overflow-wrap: anywhere");
    expect(suggestions).toContain("min-width: 0");
    expect(suggestions).toContain("overflow: hidden");
  });
});
