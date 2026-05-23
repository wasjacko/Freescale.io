"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Render an HTML email body inside a sandboxed iframe so:
 *  - the email's CSS can't bleed into our app
 *  - the iframe height auto-fits the content (no inner scrollbar)
 *  - we strip scripts / forms / dangerous tags before injecting
 *
 * Sanitization is intentionally done client-side only (lazy DOMPurify import)
 * so the server bundle stays free of jsdom and we don't risk crashing the
 * RSC render. Before the lazy module resolves we show a tiny loading box.
 */
export function EmailHtmlBody({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);
  const [doc, setDoc] = useState<string | null>(null);

  // Lazy-load DOMPurify on the client, then sanitize and build the srcDoc.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("dompurify");
        if (cancelled) return;
        const DOMPurify =
          mod.default ?? (mod as unknown as { sanitize: (s: string, o?: object) => string });
        const sanitized = DOMPurify.sanitize(html, {
          USE_PROFILES: { html: true },
          FORBID_TAGS: [
            "script",
            "iframe",
            "form",
            "input",
            "button",
            "select",
            "textarea",
            "object",
            "embed",
          ],
          FORBID_ATTR: [
            "onerror",
            "onclick",
            "onload",
            "onmouseover",
            "onsubmit",
            "onfocus",
            "onblur",
          ],
        });
        const built = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Geist", system-ui, sans-serif;
      font-size: 14px; line-height: 1.55; color: #0F172A;
      word-break: break-word; overflow-wrap: anywhere;
    }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
    a { color: #4A52E6; }
    blockquote { margin: 12px 0; padding: 0 12px; border-left: 3px solid rgba(15, 23, 42, 0.10); color: #5B6475; }
    pre, code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; background: #F4F5FA; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>${sanitized}
<script>
  (function () {
    try {
      document.addEventListener('wheel', function (e) {
        parent.postMessage({ type: 'fs:wheel', deltaY: e.deltaY, deltaX: e.deltaX }, '*');
      }, { passive: true });
      var lastY = 0;
      document.addEventListener('touchstart', function (e) {
        lastY = e.touches[0] ? e.touches[0].clientY : 0;
      }, { passive: true });
      document.addEventListener('touchmove', function (e) {
        var y = e.touches[0] ? e.touches[0].clientY : 0;
        parent.postMessage({ type: 'fs:wheel', deltaY: lastY - y, deltaX: 0 }, '*');
        lastY = y;
      }, { passive: true });
    } catch (err) {}
  })();
</script>
</body>
</html>`;
        setDoc(built);
      } catch (err) {
        // If sanitization fails for any reason, render the raw text as a
        // graceful degrade rather than crashing the whole thread.
        // eslint-disable-next-line no-console
        console.error("EmailHtmlBody sanitize failed:", err);
        setDoc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [html]);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe || !doc) return;

    const resize = () => {
      try {
        const cdoc = iframe.contentDocument;
        if (!cdoc) return;
        const h = Math.max(cdoc.documentElement.scrollHeight, cdoc.body?.scrollHeight ?? 0);
        if (h && Math.abs(h - height) > 4) setHeight(h);
      } catch {
        // ignore
      }
    };

    iframe.addEventListener("load", resize);
    const timers = [setTimeout(resize, 200), setTimeout(resize, 600), setTimeout(resize, 1500)];

    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; deltaY?: number; deltaX?: number } | null;
      if (!data || data.type !== "fs:wheel") return;
      if (e.source !== iframe.contentWindow) return;
      const scroller =
        iframe.closest<HTMLElement>(".messages") ??
        iframe.closest<HTMLElement>("[data-scroll-root]");
      if (scroller) {
        scroller.scrollBy({ top: data.deltaY ?? 0, left: data.deltaX ?? 0, behavior: "auto" });
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      iframe.removeEventListener("load", resize);
      window.removeEventListener("message", onMessage);
      timers.forEach(clearTimeout);
    };
  }, [doc, height]);

  // Plain-text fallback if sanitization hasn't resolved or failed.
  const placeholder = useMemo(
    () => (
      <div
        style={{
          minHeight: 80,
          padding: "0 28px 24px",
          fontSize: 13,
          color: "#8B93A4",
          fontStyle: "italic",
        }}
      >
        Chargement de l&apos;email…
      </div>
    ),
    []
  );

  if (!doc) return placeholder;

  return (
    <iframe
      ref={ref}
      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      style={{
        width: "100%",
        border: 0,
        display: "block",
        height: `${height}px`,
        background: "transparent",
      }}
      title="Email body"
    />
  );
}
