"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let shouldReload = false;

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
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      shouldReload = deltaY >= RELOAD_THRESHOLD && deltaY > Math.abs(deltaX) * 1.4;
    };

    const finishGesture = () => {
      if (tracking && shouldReload) window.location.reload();
      tracking = false;
      shouldReload = false;
    };

    const cancelGesture = () => {
      tracking = false;
      shouldReload = false;
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
    };
  }, []);

  return null;
}
