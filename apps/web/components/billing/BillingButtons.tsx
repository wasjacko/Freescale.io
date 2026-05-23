"use client";

import { createBillingPortalSession, startCheckout } from "@/lib/actions/billing";
import type { BillingInterval, PaidPlan } from "@/lib/billing";
import { useState, useTransition } from "react";

type ButtonVariant = "primary" | "secondary";

function classForVariant(variant: ButtonVariant, className?: string): string {
  return ["set-btn", variant === "primary" ? "set-btn-primary" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function CheckoutButton({
  children,
  className,
  interval,
  plan,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  interval: BillingInterval;
  plan: PaidPlan;
  variant?: ButtonVariant;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await startCheckout({ interval, plan });
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? "Checkout indisponible.");
    });
  };

  return (
    <span className="billing-action-wrap">
      <button
        type="button"
        className={classForVariant(variant, className)}
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "Ouverture..." : children}
      </button>
      {error && <span className="billing-action-error">{error}</span>}
    </span>
  );
}

export function PortalButton({
  children = "Gérer dans Stripe",
  className,
  variant = "secondary",
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await createBillingPortalSession();
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? "Portail Stripe indisponible.");
    });
  };

  return (
    <span className="billing-action-wrap">
      <button
        type="button"
        className={classForVariant(variant, className)}
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "Ouverture..." : children}
      </button>
      {error && <span className="billing-action-error">{error}</span>}
    </span>
  );
}
