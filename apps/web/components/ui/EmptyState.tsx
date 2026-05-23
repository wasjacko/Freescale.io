"use client";

import { Icon } from "@/components/icons/Icon";
import type { ReactNode } from "react";

/**
 * Shared empty-state component used by Tasks / Calendar / Knowledge /
 * any future zero-data surface. Same silhouette as NoChannelsHero
 * (icon orb + title + sub + optional CTA) so the visual language stays
 * consistent across "this list has no items yet" moments.
 */
type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string | undefined;
  cta?: { label: string; onClick: () => void } | ReactNode;
};

export function EmptyState({ icon = "i-spark", title, description, cta }: EmptyStateProps) {
  return (
    <div className="empty-state-card" role="status">
      <div className="empty-state-orb" aria-hidden>
        <span className="empty-state-orb-core" />
        <span className="empty-state-orb-icon">
          <Icon name={icon} />
        </span>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {cta && typeof cta === "object" && "label" in cta && "onClick" in cta ? (
        <button type="button" className="empty-state-cta" onClick={cta.onClick}>
          {cta.label}
        </button>
      ) : (
        cta
      )}
    </div>
  );
}
