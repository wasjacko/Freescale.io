type IconProps = {
  name: string;
  className?: string;
  size?: number;
};

/** Renders an icon from the global sprite via `#i-…` reference. */
export function Icon({ name, className = "icon", size }: IconProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg className={className} style={style} aria-hidden="true">
      <use href={`#${name.startsWith("i-") || name.startsWith("l-") ? name : `i-${name}`}`} />
    </svg>
  );
}

type ChannelLogoProps = {
  channel: string;
  className?: string;
};

/** Renders a channel brand logo via the sprite. */
export function ChannelLogo({ channel, className = "channel-logo" }: ChannelLogoProps) {
  return (
    <span className={className}>
      <svg viewBox="0 0 48 48">
        <use href={`#l-${channel}`} />
      </svg>
    </span>
  );
}
