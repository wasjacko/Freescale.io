"use client";

import { useState } from "react";
import type { Avatar as AvatarType } from "@/lib/types";

type Props = {
  avatar: AvatarType;
  className?: string;
  size?: number;
};

/**
 * Renders an avatar. When the source is an <img> URL and the request fails
 * (Gravatar `d=404`, DuckDuckGo with no favicon for that domain, blocked by
 * the network, etc.), we fall back to colored initials so the inbox never
 * shows the same generic placeholder for unknown senders.
 */
export function Avatar({ avatar, className = "avatar", size }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

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

  if (avatar.kind === "initials") {
    if (avatar.bg) style.background = avatar.bg;
    return (
      <span className={className} style={style}>
        {avatar.text}
      </span>
    );
  }

  if (imgFailed) {
    return (
      <span className={className} style={style}>
        {fallbackInitials}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar.src}
        alt={avatar.alt ?? ""}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    </span>
  );
}
