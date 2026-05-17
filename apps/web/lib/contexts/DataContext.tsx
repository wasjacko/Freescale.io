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

type Ctx = {
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  tasks: Task[];
  events: CalEvent[];
  upcoming: UpcomingEvent[];
  channels: ConnectedChannel[];
  archived: Set<string>;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  appendOutgoingMessage: (convId: string, text: string) => Promise<void>;
  toggleTask: (taskId: string, done: boolean) => Promise<void>;
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

  const value = useMemo<Ctx>(
    () => ({
      conversations,
      messagesByConv,
      tasks,
      events: initial.events,
      upcoming: initial.upcoming,
      channels: initial.channels,
      archived,
      markRead,
      markUnread,
      archive,
      unarchive,
      appendOutgoingMessage,
      toggleTask,
    }),
    [
      conversations,
      messagesByConv,
      tasks,
      initial.events,
      initial.upcoming,
      initial.channels,
      archived,
      markRead,
      markUnread,
      archive,
      unarchive,
      appendOutgoingMessage,
      toggleTask,
    ]
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
