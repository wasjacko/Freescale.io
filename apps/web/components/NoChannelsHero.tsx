"use client";

import { useState } from "react";
import { MueAvatar } from "@/components/MueAvatar";
import { ChannelLogo } from "@/components/icons/Icon";
import { AddChannelModal } from "@/components/AddChannelModal";

/**
 * Shown in the inbox panel when the workspace has zero connected channels.
 * The whole point of Freescale is to centralize channels — without one,
 * the app has nothing to show, so we make the next step obvious and
 * visually inviting instead of leaving a blank "Inbox zero" placeholder.
 */
export function NoChannelsHero() {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-channels-hero">
      <div className="no-channels-mue">
        <MueAvatar />
      </div>

      <h2 className="no-channels-title">Branchez votre premier canal</h2>
      <p className="no-channels-sub">
        Freescale rassemble toutes vos messageries en une seule inbox. Connectez
        Gmail pour voir vos emails arriver ici en temps réel.
      </p>

      <div className="no-channels-logos" aria-hidden>
        <span className="no-channels-logo"><ChannelLogo channel="gmail" /></span>
        <span className="no-channels-logo dim"><ChannelLogo channel="slack" /></span>
        <span className="no-channels-logo dim"><ChannelLogo channel="instagram" /></span>
        <span className="no-channels-logo dim"><ChannelLogo channel="whatsapp" /></span>
        <span className="no-channels-logo dim"><ChannelLogo channel="discord" /></span>
      </div>

      <button
        type="button"
        className="no-channels-cta"
        onClick={() => setOpen(true)}
      >
        Connecter Gmail
      </button>

      <p className="no-channels-fine">
        Tokens chiffrés. Vous gardez la main, déconnectable en un clic.
      </p>

      <AddChannelModal
        open={open}
        onClose={() => setOpen(false)}
        connectedKinds={new Set()}
      />
    </div>
  );
}
