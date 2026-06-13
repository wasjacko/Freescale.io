"use client";

import {
  createCalendarEvent as srvCreateEvent,
  deleteCalendarEvent as srvDeleteEvent,
  updateCalendarEvent as srvUpdateEvent,
} from "@/lib/actions/calendar";
import {
  setConversationCategory as srvSetCategory,
  setConversationTags as srvSetTags,
  snoozeConversation as srvSnooze,
  toggleConversationStar as srvToggleStar,
} from "@/lib/actions/conversation-flags";
import {
  archiveConversation as srvArchive,
  markConversationRead as srvMarkRead,
  markConversationUnread as srvMarkUnread,
  sendMessage as srvSend,
  toggleTaskDone as srvToggleTask,
  unarchiveConversation as srvUnarchive,
} from "@/lib/actions/inbox";
import type { MemberRole } from "@/lib/collaboration";
import type { ConnectedChannel, InboxData } from "@/lib/data/queries";
import type { CalEvent, ChannelId, Conversation, Message, Task, UpcomingEvent } from "@/lib/types";
import type { ConversationCategory } from "@/lib/types";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Returns the local Sunday-at-00:00 ISO for the current week. Used as
 * the anchor for translating grid coordinates (day 0-6 + minutes-from-
 * 8AM) into absolute timestamps in calendar server actions.
 */
function currentWeekStartIso(): string {
  const now = new Date();
  const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  sun.setHours(0, 0, 0, 0);
  return sun.toISOString();
}

type Ctx = {
  conversations: Conversation[];
  activeWorkspaceId: string | null;
  currentWorkspaceRole: MemberRole | null;
  workspaces: Array<{ id: string; name: string; role: MemberRole }>;
  canConnectChannels: boolean;
  messagesByConv: Record<string, Message[]>;
  tasks: Task[];
  events: CalEvent[];
  upcoming: UpcomingEvent[];
  channels: ConnectedChannel[];
  archived: Set<string>;
  isSyncing: boolean;
  setIsSyncing: (b: boolean) => void;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  appendOutgoingMessage: (convId: string, text: string) => Promise<void>;
  retryFailedMessage: (convId: string, msgId: string) => Promise<void>;
  toggleTask: (taskId: string, done: boolean) => Promise<void>;
  addTask: (task: Task) => void;
  /** Réordonne les tâches de premier niveau selon la nouvelle liste d'ids. */
  reorderTasks: (orderedVisibleIds: string[]) => void;
  /** Change le statut d'une tâche (drag entre les colonnes À faire / En cours / Terminé). */
  setTaskStatus: (taskId: string, status: Task["status"]) => void;
  /** Supprime une tâche (et ses sous-tâches) — local/optimiste, undo via re-addTask. */
  removeTask: (taskId: string) => void;
  /** Patch local d'une tâche (titre, échéance…) — édition inline. */
  patchTask: (taskId: string, partial: Partial<Task>) => void;
  toggleStar: (convId: string, starred: boolean) => Promise<void>;
  snooze: (convId: string, untilIso: string | null) => Promise<void>;
  setTags: (convId: string, tags: string[]) => Promise<void>;
  setCategory: (convId: string, category: ConversationCategory) => Promise<void>;
  createEvent: (input: {
    title: string;
    day: number;
    startMinutes: number;
    durationMinutes: number;
    color?: CalEvent["color"];
  }) => Promise<{ ok: boolean; error: string | null }>;
  updateEvent: (input: {
    id: string;
    title?: string;
    day?: number;
    startMinutes?: number;
    durationMinutes?: number;
  }) => Promise<{ ok: boolean; error: string | null }>;
  deleteEvent: (id: string) => Promise<{ ok: boolean; error: string | null }>;
  createConversation: (
    name: string,
    channel: ChannelId,
    text: string,
    subject?: string
  ) => Promise<string>;
};

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({
  initial,
  children,
}: {
  initial: InboxData;
  children: ReactNode;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initial.conversations);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>(
    initial.messagesByConv
  );
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [events, setEvents] = useState<CalEvent[]>(initial.events);
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  // Re-sync local state whenever the server pushes a new payload (e.g.
  // after router.refresh()'s following an action). Without this useEffect,
  // useState only ran the initializer once and replies never appeared in
  // the thread until a full page reload.
  useEffect(() => {
    setConversations(initial.conversations);
    setMessagesByConv(initial.messagesByConv);
    setTasks(initial.tasks);
    setEvents(initial.events);
  }, [initial.conversations, initial.messagesByConv, initial.tasks, initial.events]);

  const markRead = useCallback(async (id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
    await srvMarkRead(id);
  }, []);

  const markUnread = useCallback(async (id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: true } : c)));
    await srvMarkUnread(id);
  }, []);

  const archive = useCallback((id: string) => {
    setArchived((prev) => new Set(prev).add(id));
    void srvArchive(id);
  }, []);

  const unarchive = useCallback((id: string) => {
    setArchived((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    void srvUnarchive(id);
  }, []);

  const appendOutgoingMessage = useCallback(async (convId: string, text: string) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    // Snapshot the bits we mutate optimistically so we can roll them back
    // if srvSend rejects (rate-limited Gmail, network glitch, etc.).
    // Without this, a failed send LOOKED successful — the temp message
    // sat in the thread forever and the destinataire never received it.
    let prevPreview: string | undefined;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        prevPreview = c.preview;
        return { ...c, preview: text.slice(0, 80) };
      })
    );
    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [
        ...(prev[convId] ?? []),
        { id: tempId, dir: "out", text, time, status: "pending" },
      ],
    }));

    try {
      await srvSend(convId, text);
      // Success — strip the "pending" badge. The next router.refresh()
      // will replace this temp row with the real server message anyway.
      // (exactOptionalPropertyTypes forbids assigning undefined, so we
      // destructure the field out instead of overwriting it.)
      setMessagesByConv((prev) => {
        const list = prev[convId] ?? [];
        return {
          ...prev,
          [convId]: list.map((m) => {
            if (m.id !== tempId) return m;
            const { status: _drop, ...rest } = m;
            void _drop;
            return rest;
          }),
        };
      });
    } catch (err) {
      // Rollback: flip the temp message to "failed" so the user keeps
      // their draft visible and knows it didn't go through. Restore
      // the conv preview so the inbox row stops claiming "you replied".
      setMessagesByConv((prev) => {
        const list = prev[convId] ?? [];
        return {
          ...prev,
          [convId]: list.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
        };
      });
      if (prevPreview !== undefined) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, preview: prevPreview as string } : c))
        );
      }
      // Re-throw so the caller can surface a toast with the real reason.
      throw err;
    }
  }, []);

  const retryFailedMessage = useCallback(async (convId: string, msgId: string) => {
    // Re-send a previously-failed optimistic message in place. Same id
    // (no duplicates in the thread), flip pending → success/failed
    // based on the srvSend outcome.
    let textToSend: string | null = null;
    setMessagesByConv((prev) => {
      const list = prev[convId] ?? [];
      return {
        ...prev,
        [convId]: list.map((m) => {
          if (m.id !== msgId) return m;
          textToSend = m.text;
          return { ...m, status: "pending" };
        }),
      };
    });
    if (!textToSend) return;

    try {
      await srvSend(convId, textToSend);
      setMessagesByConv((prev) => {
        const list = prev[convId] ?? [];
        return {
          ...prev,
          [convId]: list.map((m) => {
            if (m.id !== msgId) return m;
            const { status: _drop, ...rest } = m;
            void _drop;
            return rest;
          }),
        };
      });
    } catch (err) {
      setMessagesByConv((prev) => {
        const list = prev[convId] ?? [];
        return {
          ...prev,
          [convId]: list.map((m) => (m.id === msgId ? { ...m, status: "failed" } : m)),
        };
      });
      throw err;
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string, done: boolean) => {
    // Mirror the server-side cascade exactly: checking a parent also
    // marks all its currently-open children as done (no half-completed
    // parents on screen). Un-checking is non-cascading on both sides —
    // some subtasks might legitimately be done while the parent isn't,
    // so we don't second-guess the user.
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, isDone: done, status: done ? "done" : "todo" };
        }
        if (done && t.parentTaskId === taskId && !t.isDone) {
          return { ...t, isDone: true, status: "done" };
        }
        return t;
      })
    );
    await srvToggleTask(taskId, done);
  }, []);

  // Ajout optimiste d'une tâche — impact immédiat sur le dashboard.
  const addTask = useCallback((task: Task) => {
    setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [task, ...prev]));
  }, []);

  // Réorganisation par glisser-déposer (façon Notion). Réordonne les tâches
  // de premier niveau selon `orderedVisibleIds` et réécrit leur sortableIndex
  // pour refléter le nouvel ordre. Les sous-tâches (non listées) sont conservées
  // telles quelles, à la suite. Optimiste/local : pas d'action serveur dédiée
  // côté maquette (DEV_NO_AUTH), l'ordre tient pour la session.
  const reorderTasks = useCallback((orderedVisibleIds: string[]) => {
    setTasks((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      const seen = new Set(orderedVisibleIds);
      const reordered: Task[] = [];
      for (const id of orderedVisibleIds) {
        const t = byId.get(id);
        if (t) reordered.push({ ...t, sortableIndex: reordered.length });
      }
      const rest = prev.filter((t) => !seen.has(t.id));
      return [...reordered, ...rest];
    });
  }, []);

  // Change le statut d'une tâche (glisser entre les colonnes À faire / En cours
  // / Terminé, ou clic sur la case). Optimiste et LOCAL : comme reorderTasks, on
  // ne touche pas au serveur ici. En maquette (DEV_NO_AUTH) une action serveur
  // déclencherait un router.refresh() qui réécrase l'état optimiste avec le
  // payload statique du mock (et remettrait le tableau à zéro). La persistance
  // réelle du statut se branchera côté Supabase à l'étape prod.
  const setTaskStatus = useCallback((taskId: string, status: Task["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, isDone: status === "done" } : t))
    );
  }, []);

  // Suppression locale (menu ⋯ de la page Tâches). Même contrat que
  // setTaskStatus/reorderTasks : optimiste, sans action serveur en maquette.
  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId && t.parentTaskId !== taskId));
  }, []);

  // Patch local générique (renommage, re-planification inline…).
  const patchTask = useCallback((taskId: string, partial: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...partial } : t)));
  }, []);

  const toggleStar = useCallback(async (convId: string, starred: boolean) => {
    // Optimistic flip — UI updates instantly, server catches up.
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, starred } : c)));
    await srvToggleStar(convId, starred);
  }, []);

  const snooze = useCallback(async (convId: string, untilIso: string | null) => {
    // Optimistic remove from the list when snoozing into the future,
    // or update the field if un-snoozing. Server confirms async.
    setConversations((prev) =>
      untilIso && new Date(untilIso) > new Date()
        ? prev.filter((c) => c.id !== convId)
        : prev.map((c) => (c.id === convId ? { ...c, snoozedUntilIso: untilIso } : c))
    );
    await srvSnooze(convId, untilIso);
  }, []);

  const setCategory = useCallback(async (convId: string, category: ConversationCategory) => {
    // Optimistic flip — UI snaps to the new tab/badge instantly. If the
    // server write fails, the next router.refresh() re-syncs.
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, category } : c)));
    await srvSetCategory(convId, category);
  }, []);

  const setTags = useCallback(async (convId: string, tags: string[]) => {
    // Optimistic write. The server normalizes (lower-case + dedup +
    // clamp to 12) and returns the canonical list, which we re-apply.
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, tags } : c)));
    const res = await srvSetTags(convId, tags);
    if (res.ok) {
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, tags: res.tags } : c)));
    }
  }, []);

  // ─── Calendar events — optimistic CRUD ────────────────────────────
  const createEvent = useCallback(
    async (input: {
      title: string;
      day: number;
      startMinutes: number;
      durationMinutes: number;
      color?: CalEvent["color"];
    }) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: CalEvent = {
        id: tempId,
        title: input.title,
        day: input.day as CalEvent["day"],
        startMinutes: input.startMinutes,
        durationMinutes: input.durationMinutes,
        color: input.color ?? "lav",
      };
      setEvents((prev) => [...prev, optimistic]);
      const res = await srvCreateEvent({
        ...input,
        weekStartIso: currentWeekStartIso(),
      });
      const createdId = res.id;
      if (res.ok && createdId) {
        // Swap the temp id for the real DB one so subsequent updates
        // target the right row.
        setEvents((prev) => prev.map((e) => (e.id === tempId ? { ...e, id: createdId } : e)));
        return { ok: true, error: null };
      }
      // Rollback on failure.
      setEvents((prev) => prev.filter((e) => e.id !== tempId));
      return { ok: false, error: res.error };
    },
    []
  );

  const updateEvent = useCallback(
    async (input: {
      id: string;
      title?: string;
      day?: number;
      startMinutes?: number;
      durationMinutes?: number;
    }) => {
      // Snapshot prev so we can rollback on failure.
      let prevEvent: CalEvent | null = null;
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== input.id) return e;
          prevEvent = e;
          return {
            ...e,
            ...(input.title !== undefined && { title: input.title }),
            ...(input.day !== undefined && { day: input.day as CalEvent["day"] }),
            ...(input.startMinutes !== undefined && { startMinutes: input.startMinutes }),
            ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
          };
        })
      );
      const res = await srvUpdateEvent({
        ...input,
        weekStartIso: currentWeekStartIso(),
      });
      if (!res.ok && prevEvent) {
        setEvents((prev) => prev.map((e) => (e.id === input.id ? (prevEvent as CalEvent) : e)));
      }
      return res;
    },
    []
  );

  const deleteEvent = useCallback(async (id: string) => {
    let removed: CalEvent | null = null;
    setEvents((prev) => {
      removed = prev.find((e) => e.id === id) ?? null;
      return prev.filter((e) => e.id !== id);
    });
    const res = await srvDeleteEvent(id);
    if (!res.ok && removed) {
      // Rollback — put it back where it was (order doesn't matter for
      // calendar rendering, it's grid-positioned by day/startMinutes).
      setEvents((prev) => [...prev, removed as CalEvent]);
    }
    return res;
  }, []);

  const createConversation = useCallback(
    async (name: string, channel: ChannelId, text: string, subject?: string) => {
      const newId = `c-new-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

      const newConv: Conversation = {
        id: newId,
        name,
        preview: text.slice(0, 80),
        lastAtIso: now,
        avatar: { kind: "initials", text: name.substring(0, 2).toUpperCase(), bg: "#4f46e5" },
        channel,
        unread: false,
        group: "today",
        subject: subject || "Nouveau message",
        contactEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        category: "client",
        tags: [],
        lastInboundAt: null,
        lastOutboundAt: now,
      };

      setConversations((prev) => [newConv, ...prev]);
      setMessagesByConv((prev) => ({
        ...prev,
        [newId]: [
          {
            id: `msg-${crypto.randomUUID()}`,
            dir: "out",
            text,
            time,
            sentAtIso: now,
          },
        ],
      }));

      return newId;
    },
    []
  );

  const value = useMemo<Ctx>(
    () => ({
      conversations,
      activeWorkspaceId: initial.activeWorkspaceId,
      currentWorkspaceRole: initial.currentWorkspaceRole,
      workspaces: initial.workspaces,
      canConnectChannels: initial.canConnectChannels,
      messagesByConv,
      tasks,
      events,
      upcoming: initial.upcoming,
      channels: initial.channels,
      archived,
      isSyncing,
      setIsSyncing,
      markRead,
      markUnread,
      archive,
      unarchive,
      appendOutgoingMessage,
      retryFailedMessage,
      toggleTask,
      addTask,
      reorderTasks,
      setTaskStatus,
      removeTask,
      patchTask,
      toggleStar,
      snooze,
      setTags,
      setCategory,
      createEvent,
      updateEvent,
      deleteEvent,
      createConversation,
    }),
    [
      conversations,
      initial.activeWorkspaceId,
      initial.currentWorkspaceRole,
      initial.workspaces,
      initial.canConnectChannels,
      messagesByConv,
      tasks,
      events,
      initial.upcoming,
      initial.channels,
      isSyncing,
      archived,
      markRead,
      markUnread,
      archive,
      unarchive,
      appendOutgoingMessage,
      retryFailedMessage,
      toggleTask,
      addTask,
      reorderTasks,
      setTaskStatus,
      removeTask,
      patchTask,
      toggleStar,
      createEvent,
      updateEvent,
      deleteEvent,
      createConversation,
      snooze,
      setTags,
      setCategory,
    ]
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
