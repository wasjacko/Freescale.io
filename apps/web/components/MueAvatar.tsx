"use client";

import { useEffect, useRef } from "react";

const PALETTE: Record<string, string> = {
  n: "#B79EFC",
  m: "#C4B5FD",
  l: "#DDD6FE",
  L: "#F3EAFE",
  w: "#FFFAFE",
  o: "#0F172A",
  h: "#FFFFFF",
  f: "#FBCFE8",
  p: "#F472B6",
  t: "#FED7AA",
};

// 16×16 baby salamander Mue — chunky head, big eyes, tiny body + tail
const GRID = [
  "....nnnnnnnnnn..",
  "..nnmmllllllmmnn",
  ".nmllLLLLLLLLllm",
  "nmlLLwwLLwwLLLlm",
  "nmlLwhoowwhoowLm",
  "nmlLwooowwooowLm",
  "nmlLLwwLLwwLLLlm",
  "nmlLLLLfppfLLLlm",
  "nmlLfLLLppLLLfll",
  ".nmlLLLLLLLLLll.",
  "..nmmllLLLLLlmm.",
  "...nnmllLLllmnn.",
  "....nnmmllmmn...",
  "......nmtlmn....",
  ".......nmtmn....",
  "........nntnn...",
];

const VB = 40;
const PX = (VB - 4) / GRID.length;

type Props = {
  className?: string;
  ariaLabel?: string;
};

export function MueAvatar({ className = "", ariaLabel = "Mue" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rectsRef = useRef<SVGRectElement[]>([]);

  useEffect(() => {
    if (!svgRef.current) return;
    const rects = rectsRef.current;
    if (!rects.length) return;

    const pulse = setInterval(() => {
      const picks = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < picks; i++) {
        const r = rects[Math.floor(Math.random() * rects.length)];
        if (!r) continue;
        r.style.opacity = (0.55 + Math.random() * 0.45).toFixed(2);
        setTimeout(() => {
          r.style.opacity = "1";
        }, 500 + Math.random() * 700);
      }
    }, 1400);

    return () => clearInterval(pulse);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onMove = (e: MouseEvent) => {
      const wrap = svg.parentElement;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(window.innerWidth, 800);
      const dy = (e.clientY - cy) / Math.max(window.innerHeight, 600);
      const MAX = 7;
      const mx = Math.max(-MAX, Math.min(MAX, dx * MAX * 2.2));
      const my = Math.max(-MAX, Math.min(MAX, dy * MAX * 2.2));
      svg.style.setProperty("--mx", `${mx}px`);
      svg.style.setProperty("--my", `${my}px`);
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  // Build the pixel grid
  const cells: React.ReactElement[] = [];
  rectsRef.current = [];

  for (let y = 0; y < GRID.length; y++) {
    const row = GRID[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === "." || ch === " ") continue;
      const fill = PALETTE[ch];
      if (!fill) continue;
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={2 + x * PX}
          y={2 + y * PX}
          width={PX}
          height={PX}
          fill={fill}
          ref={(el) => {
            if (el) rectsRef.current.push(el);
          }}
        />
      );
    }
  }

  // Sparkles around the body
  const sparkles = [
    { x: 33, y: 4, fill: "#FBBF24" },
    { x: 35, y: 7, fill: "#FBBF24", opacity: 0.6 },
    { x: 3, y: 30, fill: "#60A5FA" },
    { x: 1, y: 33, fill: "#60A5FA", opacity: 0.55 },
    { x: 30, y: 34, fill: "#F472B6", opacity: 0.8 },
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB} ${VB}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      {cells}
      {sparkles.map((s, i) => (
        <rect key={`sp-${i}`} x={s.x} y={s.y} width={1.5} height={1.5} fill={s.fill} opacity={s.opacity} />
      ))}
    </svg>
  );
}
