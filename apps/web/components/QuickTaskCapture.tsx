"use client";

import { createTask } from "@/lib/actions/inbox";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function QuickTaskCapture() {
  const router = useRouter();
  const push = useToast((state) => state.push);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    startTransition(async () => {
      const result = await createTask({ title: trimmed, priority: "medium" });
      if (!result.ok) {
        push({ kind: "error", text: result.error ?? "Création impossible." });
        return;
      }
      setTitle("");
      push({ kind: "info", text: "Tâche ajoutée.", duration: 2200 });
      router.refresh();
    });
  };

  return (
    <form
      className="quick-task-capture"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="quick-task-title">
        Ajouter une tâche
      </label>
      <input
        id="quick-task-title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Ajouter une tâche..."
      />
      <button type="submit" disabled={!title.trim() || pending}>
        {pending ? "Ajout" : "Ajouter"}
      </button>
    </form>
  );
}
