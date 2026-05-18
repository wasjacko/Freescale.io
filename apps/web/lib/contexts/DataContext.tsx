"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { CalEvent, Conversation, Message, Task, UpcomingEvent } from "@/lib/types";
import type { ConnectedChannel, InboxData } from "@/lib/data/queries";
import {
  markConversationRead as srvMarkRead,
  markConversationUnread as srvMarkUnread,
  archiveConversation as srvArchive,
  sendMessage as srvSend,
  toggleTaskDone as srvToggleTask,
} from "@/lib/actions/inbox";
import {
  toggleConversationStar as srvToggleStar,
  snoozeConversation as srvSnooze,
  setConversationTags as srvSetTags,
} from "@/lib/actions/conversation-flags";

type Ctx = {
  conversations: Conversation[];
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
  toggleTask: (taskId: string, done: boolean) => Promise<void>;
  toggleStar: (convId: string, starred: boolean) => Promise<void>;
  snooze: (convId: string, untilIso: string | null) => Promise<void>;
  setTags: (convId: string, tags: string[]) => Promise<void>;
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
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>(initial.messagesByConv);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
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
  }, [initial.conversations, initial.messagesByConv, initial.tasks]);

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
  }, []);

  const appendOutgoingMessage = useCallback(async (convId: string, text: string) => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), { id: tempId, dir: "out", text, time }],
    }));
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, preview: text.slice(0, 80), time: "now" } : c))
    );
    await srvSend(convId, text);
  }, []);

  const toggleTask = useCallback(async (taskId: string, done: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isDone: done, status: done ? "done" : "todo" } : t))
    );
    await srvToggleTask(taskId, done);
  }, []);

  const toggleStar = useCallback(async (convId: string, starred: boolean) => {
    // Optimistic flip — UI updates instantly, server catches up.
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, starred } : c))
    );
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

  const setTags = useCallback(async (convId: string, tags: string[]) => {
    // Optimistic write. The server normalizes (lower-case + dedup +
    // clamp to 12) and returns the canonical list, which we re-apply.
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, tags } : c))
    );
    const res = await srvSetTags(convId, tags);
    if (res.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, tags: res.tags } : c))
      );
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      conversations,
      messagesByConv,
      tasks,
      events: initial.events,
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
      toggleTask,
      toggleStar,
      snooze,
      setTags,
    }),
    [
      conversations,
      messagesByConv,
      tasks,
      initial.events,
      initial.upcoming,
      initial.channels,
      isSyncing,
      archived,
      markRead,
      markUnread,
      archive,
      unarchive,
      appendOutgoingMessage,
      toggleTask,
      toggleStar,
      snooze,
      setTags,
    ]
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
