"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

const RELOAD_THRESHOLD = 88;
const MAX_VISUAL_PULL = 82;
const PULL_RESISTANCE = 0.72;

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
  const hapticSwitchRef = useRef<HTMLInputElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [ready, setReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let shouldReload = false;
    let reloadTimer: number | undefined;
    let settleTimer: number | undefined;

    hapticSwitchRef.current?.setAttribute("switch", "");

    const playHaptic = (pattern: number | number[]) => {
      if (navigator.vibrate?.(pattern)) return;
      hapticSwitchRef.current?.click();
    };

    if (root.classList.contains("site-reload-boot")) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => root.classList.remove("site-reload-boot"));
      });
    }

    const setShellOffset = (offset: number) => {
      root.style.setProperty("--mobile-pull-offset", `${offset}px`);
    };

    const resetIndicator = () => {
      setPullDistance(0);
      setReady(false);
      root.classList.remove("is-site-pulling");
      root.classList.add("is-site-pull-settling");
      setShellOffset(0);
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => root.classList.remove("is-site-pull-settling"), 260);
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
      root.classList.remove("is-site-pull-settling");
      root.classList.add("is-site-pulling");
      setPullDistance(0);
      setReady(false);
      setShellOffset(0);
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

      if (event.cancelable) event.preventDefault();

      const wasReady = shouldReload;
      shouldReload = deltaY >= RELOAD_THRESHOLD;
      const visualPull = Math.min(MAX_VISUAL_PULL, deltaY * PULL_RESISTANCE);
      setPullDistance(visualPull);
      setShellOffset(visualPull);
      setReady(shouldReload);

      if (shouldReload && !wasReady) playHaptic(12);
    };

    const finishGesture = () => {
      if (tracking && shouldReload) {
        playHaptic([10, 22, 16]);
        setReloading(true);
        // Conserver exactement la position atteinte par le pouce. L'ancien
        // retour anime vers 0 faisait remonter toute la page juste avant que
        // le navigateur ne la recharge, d'ou le saut visible sur iPhone.
        root.classList.add("is-site-pulling");
        sessionStorage.setItem("freescale:pull-reload", "1");
        window.history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
        reloadTimer = window.setTimeout(() => window.location.reload(), 160);
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
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", finishGesture, { passive: true });
    document.addEventListener("touchcancel", cancelGesture, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", finishGesture);
      document.removeEventListener("touchcancel", cancelGesture);
      if (reloadTimer) window.clearTimeout(reloadTimer);
      if (settleTimer) window.clearTimeout(settleTimer);
      root.classList.remove("is-site-pulling", "is-site-pull-settling");
      root.style.removeProperty("--mobile-pull-offset");
    };
  }, []);

  const progress = ready ? 1 : Math.min(1, pullDistance / (RELOAD_THRESHOLD * PULL_RESISTANCE));
  const visible = pullDistance > 4 || reloading;

  return (
    <>
      <div
        className={`mobile-site-reload ${visible ? "is-visible" : ""} ${ready ? "is-ready" : ""} ${reloading ? "is-reloading" : ""}`}
        style={{ "--reload-progress": progress } as CSSProperties}
        role="status"
        aria-live="polite"
        aria-hidden={!visible}
        aria-label={
          reloading
            ? "Actualisation en cours"
            : ready
              ? "Relâchez pour actualiser"
              : "Tirez pour actualiser"
        }
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
      </div>
      <input
        ref={hapticSwitchRef}
        className="mobile-site-reload__haptic"
        type="checkbox"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}
