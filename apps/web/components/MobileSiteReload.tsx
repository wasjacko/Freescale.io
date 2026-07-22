"use client";

import { type CSSProperties, useEffect, useState } from "react";

const RELOAD_THRESHOLD = 88;

function isAtTop(target: EventTarget | null) {
  if (window.scrollY > 0) return false;

  let element = target instanceof HTMLElement ? target : null;
  while (element && element !== document.body) {
    if (element.scrollTop > 0) return false;
    element = element.parentElement;
  }

  return true;
}

/**
 * Restores a site-level pull-to-reload gesture on mobile. Individual views
 * keep their automatic data synchronisation and do not own refresh controls.
 */
export function MobileSiteReload() {
  const [pullDistance, setPullDistance] = useState(0);
  const [ready, setReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let shouldReload = false;
    let reloadTimer: number | undefined;

    const resetIndicator = () => {
      setPullDistance(0);
      setReady(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (window.innerWidth >= 1024 || event.touches.length !== 1 || !isAtTop(event.target)) {
        tracking = false;
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
      shouldReload = false;
      resetIndicator();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const isVerticalPull = deltaY > 0 && deltaY > Math.abs(deltaX) * 1.4;
      if (!isVerticalPull) {
        shouldReload = false;
        resetIndicator();
        return;
      }

      const wasReady = shouldReload;
      shouldReload = deltaY >= RELOAD_THRESHOLD;
      setPullDistance(Math.min(112, deltaY * 0.72));
      setReady(shouldReload);

      if (shouldReload && !wasReady && navigator.vibrate) navigator.vibrate(12);
    };

    const finishGesture = () => {
      if (tracking && shouldReload) {
        setReloading(true);
        setPullDistance(68);
        reloadTimer = window.setTimeout(() => window.location.reload(), 220);
      } else {
        resetIndicator();
      }
      tracking = false;
      shouldReload = false;
    };

    const cancelGesture = () => {
      tracking = false;
      shouldReload = false;
      resetIndicator();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", finishGesture, { passive: true });
    document.addEventListener("touchcancel", cancelGesture, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", finishGesture);
      document.removeEventListener("touchcancel", cancelGesture);
      if (reloadTimer) window.clearTimeout(reloadTimer);
    };
  }, []);

  const progress = Math.min(1, pullDistance / RELOAD_THRESHOLD);
  const visible = pullDistance > 4 || reloading;

  return (
    <div
      className={`mobile-site-reload ${visible ? "is-visible" : ""} ${ready ? "is-ready" : ""} ${reloading ? "is-reloading" : ""}`}
      style={{ "--reload-progress": progress } as CSSProperties}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className="mobile-site-reload__icon" aria-hidden>
        {reloading ? (
          <svg viewBox="0 0 24 24">
            <path d="M20 11a8 8 0 1 0-2.35 5.65" />
            <path d="M20 5v6h-6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M12 4v15" />
            <path d="m6.5 13.5 5.5 5.5 5.5-5.5" />
          </svg>
        )}
      </span>
      <span className="mobile-site-reload__copy">
        <strong>
          {reloading
            ? "Actualisation…"
            : ready
              ? "Relâchez pour actualiser"
              : "Tirez pour actualiser"}
        </strong>
        {!reloading && <small>{ready ? "C'est prêt" : "Recharge toute l’application"}</small>}
      </span>
    </div>
  );
}
