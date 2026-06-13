import "server-only";
import type { ChannelId } from "@/lib/types";
import type { ChannelAdapter } from "./adapter";
import { gmailAdapter } from "./gmail-adapter";
import { outlookAdapter } from "./outlook-adapter";
import { UnipileAdapter } from "./unipile-adapter";

const ADAPTER_REGISTRY: Partial<Record<ChannelId, ChannelAdapter>> = {
  gmail: gmailAdapter,
  outlook: outlookAdapter,
  linkedin: new UnipileAdapter("linkedin"),
  slack: new UnipileAdapter("slack"),
  instagram: new UnipileAdapter("instagram"),
  whatsapp: new UnipileAdapter("whatsapp"),
};

export function getChannelAdapter(kind: ChannelId): ChannelAdapter | undefined {
  return ADAPTER_REGISTRY[kind];
}
