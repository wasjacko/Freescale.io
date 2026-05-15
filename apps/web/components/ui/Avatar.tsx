import type { Avatar as AvatarType } from "@/lib/types";

type Props = {
  avatar: AvatarType;
  className?: string;
  size?: number;
};

export function Avatar({ avatar, className = "avatar", size }: Props) {
  const style: React.CSSProperties = {};
  if (size) {
    style.width = size;
    style.height = size;
  }
  if (avatar.kind === "initials" && avatar.bg) {
    style.background = avatar.bg;
  }

  return (
    <span className={className} style={style}>
      {avatar.kind === "img" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar.src} alt={avatar.alt ?? ""} />
      ) : (
        avatar.text
      )}
    </span>
  );
}
