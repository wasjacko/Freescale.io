"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";

const RELOAD_THRESHOLD = 88;
const MAX_VISUAL_PULL = 82;
const RESTING_REFRESH_OFFSET = 58;

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
  const router = useRouter();
  const hapticSwitchRef = useRef<HTMLInputElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [ready, setReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let refreshing = false;
    let shouldReload = false;
    let lastVisualPull = 0;
    let refreshTimer: number | undefined;
    let settleTimer: number | undefined;

    hapticSwitchRef.current?.setAttribute("switch", "");

    const playHaptic = (pattern: number | number[]) => {
      if (navigator.vibrate?.(pattern)) return;
      hapticSwitchRef.current?.click();
    };

    const setShellOffset = (offset: number) => {
      root.style.setProperty("--mobile-pull-offset", `${offset}px`);
    };

    const resetIndicator = () => {
      setPullDistance(0);
      setReady(false);
      setReloading(false);
      lastVisualPull = 0;
      root.classList.remove("is-site-pulling", "is-site-refreshing");
      root.classList.add("is-site-pull-settling");
      setShellOffset(0);
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => root.classList.remove("is-site-pull-settling"), 260);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (
        refreshing ||
        window.innerWidth >= 1024 ||
        event.touches.length !== 1 ||
        !isAtTop(event.target)
      ) {
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
      lastVisualPull = 0;
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
      // Courbe caoutchouc : proche du doigt au depart, puis resistance douce
      // en fin de geste. Elle evite l'impression lineaire et robotique.
      const visualPull = MAX_VISUAL_PULL * (1 - Math.exp(-deltaY / 74));
      lastVisualPull = visualPull;
      setPullDistance(visualPull);
      setShellOffset(visualPull);
      setReady(shouldReload);

      if (shouldReload && !wasReady) playHaptic(12);
    };

    const finishGesture = () => {
      if (tracking && shouldReload) {
        playHaptic([10, 22, 16]);
        refreshing = true;
        setReloading(true);
        root.classList.remove("is-site-pulling");
        root.classList.add("is-site-refreshing");

        // Rafraichit les Server Components et les donnees sans detruire le
        // document. Safari ne recalcule donc ni sa barre ni le viewport.
        router.refresh();

        requestAnimationFrame(() => {
          setShellOffset(Math.min(lastVisualPull, RESTING_REFRESH_OFFSET));
        });

        refreshTimer = window.setTimeout(() => {
          root.classList.remove("is-site-refreshing");
          root.classList.add("is-site-pull-settling");
          setShellOffset(0);
          settleTimer = window.setTimeout(() => {
            root.classList.remove("is-site-pull-settling");
            setPullDistance(0);
            setReady(false);
            setReloading(false);
            refreshing = false;
            lastVisualPull = 0;
          }, 420);
        }, 360);
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
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (settleTimer) window.clearTimeout(settleTimer);
      root.classList.remove("is-site-pulling", "is-site-refreshing", "is-site-pull-settling");
      root.style.removeProperty("--mobile-pull-offset");
    };
  }, [router]);

  const progress = ready ? 1 : Math.min(1, pullDistance / RESTING_REFRESH_OFFSET);
  const visible = pullDistance > 4 || reloading;

  return (
    <>
      <div
        className={`mobile-site-reload ${visible ? "is-visible" : ""} ${ready ? "is-ready" : ""} ${reloading ? "is-reloading" : ""}`}
        style={
          {
            "--reload-progress": progress,
            "--reload-dash-offset": 50.27 * (1 - progress),
          } as CSSProperties
        }
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
          <svg viewBox="0 0 24 24">
            <circle className="mobile-site-reload__track" cx="12" cy="12" r="8" />
            <circle className="mobile-site-reload__progress" cx="12" cy="12" r="8" />
          </svg>
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
