"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";

/**
 * Render an HTML email body inside a sandboxed iframe so:
 *  - the email's CSS can't bleed into our app
 *  - the iframe height auto-fits the content (no inner scrollbar)
 *  - DOMPurify strips scripts, forms, dangerous tags before injecting
 */
export function EmailHtmlBody({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  const clean = (() => {
    const sanitized = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ALLOWED_ATTR: [
        "href", "src", "alt", "title", "target", "rel",
        "style", "class", "id", "width", "height", "align",
        "bgcolor", "color", "border", "cellpadding", "cellspacing",
        "valign", "colspan", "rowspan",
      ],
      FORBID_TAGS: ["script", "iframe", "form", "input", "button", "select", "textarea", "object", "embed"],
      FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onsubmit", "onfocus", "onblur"],
    });
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Geist", system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.55;
      color: #0F172A;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
    a { color: #4A52E6; }
    blockquote {
      margin: 12px 0;
      padding: 0 12px;
      border-left: 3px solid rgba(15, 23, 42, 0.10);
      color: #5B6475;
    }
    pre, code {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 13px;
      background: #F4F5FA;
      padding: 2px 6px;
      border-radius: 4px;
    }
  </style>
</head>
<body>${sanitized}
<script>
  // Forward wheel events to the parent window so the outer scroll container
  // can scroll past the email body. Without this, wheel events get trapped
  // inside the iframe and the parent <.messages> never scrolls.
  document.addEventListener('wheel', function (e) {
    parent.postMessage({ type: 'fs:wheel', deltaY: e.deltaY, deltaX: e.deltaX }, '*');
  }, { passive: true });
  // Same for touch scrolling on mobile / trackpads in scroll-snap mode.
  var lastY = 0;
  document.addEventListener('touchstart', function (e) {
    lastY = e.touches[0] ? e.touches[0].clientY : 0;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    var y = e.touches[0] ? e.touches[0].clientY : 0;
    parent.postMessage({ type: 'fs:wheel', deltaY: lastY - y, deltaX: 0 }, '*');
    lastY = y;
  }, { passive: true });
</script>
</body>
</html>`;
  })();

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight ?? 0
        );
        if (h && Math.abs(h - height) > 4) setHeight(h);
      } catch {
        // Cross-origin or document not ready — try again on next load
      }
    };

    iframe.addEventListener("load", resize);
    const t1 = setTimeout(resize, 200);
    const t2 = setTimeout(resize, 600);
    const t3 = setTimeout(resize, 1500);

    // Forward wheel events emitted by the iframe back to the nearest scroll
    // container in our app so the user can scroll the message list while the
    // pointer is over the email body.
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
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [clean, height]);

  return (
    <iframe
      ref={ref}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={clean}
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
