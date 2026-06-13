"use client";

import type { Avatar as AvatarType } from "@/lib/types";
import { useEffect, useState } from "react";

type Props = {
  avatar: AvatarType;
  className?: string;
  size?: number;
};

/**
 * Resolve a fallback URL when the primary avatar source fails. For business
 * domain logos served by icon.horse, we retry on DuckDuckGo's favicon API
 * (smaller but reliable). For Gravatar (personal emails), there's no useful
 * second source, so we go straight to initials.
 */
function nextFallback(currentUrl: string | undefined): string | null {
  if (!currentUrl) return null;
  if (currentUrl.startsWith("https://icon.horse/icon/")) {
    const domain = currentUrl.replace("https://icon.horse/icon/", "").split("?")[0];
    if (!domain) return null;
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  }
  return null;
}

/**
 * Renders an avatar with a graceful fallback chain when the image fails:
 *   icon.horse  →  DuckDuckGo  →  colored initials
 *   Gravatar    →  colored initials
 * Initials are derived from avatar.alt (typically the contact's display name).
 */
export function Avatar({ avatar, className = "avatar", size }: Props) {
  const initialSrc = avatar.kind === "img" ? avatar.src : null;
  const [src, setSrc] = useState<string | null>(initialSrc);

  // Reset to the new primary src whenever the parent passes a different avatar
  useEffect(() => {
    setSrc(initialSrc);
  }, [initialSrc]);

  const style: React.CSSProperties = {};
  if (size) {
    style.width = size;
    style.height = size;
  }

  const fallbackInitials =
    avatar.alt
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  // Avatars sans image : fond noir uni + texte blanc (couleur unique, plus de
  // pastilles multicolores). On préfère toujours une vraie image quand elle
  // existe ; le noir n'est que le repli.
  const initialsStyle: React.CSSProperties = {
    ...style,
    background: "#0a0a0a",
    color: "#fff",
  };

  if (avatar.kind === "initials") {
    return (
      <span className={className} style={initialsStyle}>
        {avatar.text}
      </span>
    );
  }

  if (!src) {
    return (
      <span className={className} style={initialsStyle}>
        {fallbackInitials}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={avatar.alt ?? ""}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => {
          const next = nextFallback(src);
          setSrc(next);
        }}
      />
    </span>
  );
}
