"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { AddChannelModal } from "@/components/AddChannelModal";

/**
 * Quiet empty state shown when the workspace has zero connected channels.
 * Intentionally minimal: a single icon, two short lines, one CTA. The CTA
 * opens the central AddChannelModal where the user picks the actual tool.
 */
export function NoChannelsHero() {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-channels-hero">
      <div className="no-channels-card">
        <span className="no-channels-icon">
          <Icon name="i-inbox" />
        </span>
        <h2 className="no-channels-title">Connectons votre boîte mail</h2>
        <p className="no-channels-sub">
          Freescale unifie vos messages en un seul endroit. Commencez par votre
          Gmail — c'est instantané.
        </p>
        <button
          type="button"
          className="no-channels-cta"
          onClick={() => setOpen(true)}
        >
          Connecter Gmail
        </button>
      </div>

      <AddChannelModal
        open={open}
        onClose={() => setOpen(false)}
        connectedKinds={new Set()}
      />
    </div>
  );
}
