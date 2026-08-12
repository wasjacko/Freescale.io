"use client";

import { Icon } from "@/components/icons/Icon";
import type { DailyBriefing } from "@/lib/actions/mue";

type BriefCardState = "idle" | "loading" | "result" | "error" | "no-channel";

type Props = {
  state: BriefCardState;
  data: DailyBriefing | null;
  hasChannels: boolean;
  canConnectChannel: boolean;
  onRequest: () => void;
  onConnectChannel: () => void;
  onOpenTasks: () => void;
};

export function TodayBriefCard({
  state,
  data,
  hasChannels,
  canConnectChannel,
  onRequest,
  onConnectChannel,
  onOpenTasks,
}: Props) {
  const actionCount = data?.items.length ?? 0;
  const title =
    state === "loading"
      ? "Mue prépare votre brief."
      : state === "error"
        ? "Le brief reviendra bientôt."
        : state === "no-channel"
          ? canConnectChannel
            ? "Connectez un canal pour collecter depuis vos messages."
            : "Commencez par vos tâches, sans friction."
          : actionCount > 0
            ? `${actionCount} action${actionCount > 1 ? "s" : ""} méritent votre attention.`
            : "Mue peut préparer vos prochaines actions.";
  const copy =
    state === "result" && data?.headline
      ? data.headline
      : state === "no-channel" && !canConnectChannel
        ? "Capturez ce qu'il faut faire maintenant. Les messages pourront venir plus tard."
        : "Les suggestions seront confirmées une par une avant de devenir des tâches.";

  return (
    <section className={`today-brief-card is-${state}`} aria-label="Brief Mue du jour">
      <div className="today-brief-card-top">
        <span>
          <Icon name="i-spark" />
          Mue - brief du jour
        </span>
        <span aria-hidden>...</span>
      </div>
      <h2>{title}</h2>
      <p>{copy}</p>
      <button
        type="button"
        className="today-brief-card-action"
        onClick={hasChannels ? onRequest : canConnectChannel ? onConnectChannel : onOpenTasks}
        disabled={state === "loading"}
      >
        {state === "loading"
          ? "Analyse en cours"
          : hasChannels
            ? "Voir les suggestions"
            : canConnectChannel
              ? "Connecter un canal"
              : "Ouvrir les tâches"}
      </button>
    </section>
  );
}
