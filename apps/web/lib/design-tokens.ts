/**
 * Design tokens — mirror of the @theme block in globals.css.
 * Use these in TS code when you need the value as a string (inline styles,
 * dynamic computations, canvas drawing, etc.).
 *
 * For pure CSS / JSX className, prefer the Tailwind utility classes generated
 * from the @theme block (e.g. `bg-accent`, `text-ink`, `rounded-xl`).
 */

export const colors = {
  // Surfaces
  bg: "#FAFAFC",
  bgSoft: "#F6F7FB",
  bgTint: "#F8F8FD",
  canvas: "#FFFFFF",

  // Text
  ink: "#0F172A",
  inkSoft: "#111827",
  body: "#5B6475",
  muted: "#8B93A4",
  faint: "#B8BDC9",

  // Brand
  accent: "#5B6CFF",
  accentDeep: "#4A52E6",
  violet: "#8B7BFF",
  rose: "#FFB5C8",
  peach: "#FFD5B5",
  mint: "#C8F0D8",

  // Status pastels
  pastelBlue: "#E7ECFF",
  pastelBlueInk: "#3F49C9",
  pastelGreen: "#E4F5EA",
  pastelGreenInk: "#2F7A4F",
  pastelAmber: "#FFF1DC",
  pastelAmberInk: "#8A5A12",
  pastelRose: "#FFE6EC",
  pastelRoseInk: "#B23A5C",
} as const;

export const radii = {
  sm: "12px",
  md: "16px",
  lg: "20px",
  xl: "24px",
  full: "9999px",
} as const;

export const shadows = {
  soft: "0 1px 2px rgba(15, 23, 42, 0.03), 0 4px 14px rgba(15, 23, 42, 0.04)",
  floating: "0 10px 40px rgba(88, 92, 255, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)",
} as const;

export const motion = {
  durations: {
    fast: "140ms",
    base: "220ms",
    slow: "360ms",
    verySlow: "560ms",
  },
  easings: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    in: "cubic-bezier(0.42, 0, 1, 1)",
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

export const fonts = {
  sans: '"Geist", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radii;
export type ShadowToken = keyof typeof shadows;
