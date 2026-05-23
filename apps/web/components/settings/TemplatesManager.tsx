"use client";

import {
  type EmailTemplate,
  createEmailTemplate,
  deleteEmailTemplate,
  updateEmailTemplate,
} from "@/lib/actions/email-templates";
import { useState, useTransition } from "react";

/**
 * Settings → Modèles. List of saved templates with inline create/edit/delete.
 * The composer reads these via listEmailTemplates() and inserts the body
 * above the user's signature on pick.
 *
 * Implementation notes:
 *  - We keep an in-memory `templates` array and update it optimistically
 *    after a successful server action, rather than relying on router.refresh().
 *    The page is rarely-visited, so the latency win of optimism is small but
 *    UX-meaningful (form clears feel instant).
 *  - We don't show a confirmation toast for delete — the row physically
 *    disappears, and there's no undo across page reloads, so the visual is
 *    enough. (We DO require a two-step confirm so an accidental click can't
 *    nuke the user's prized snippet.)
 */
export function TemplatesManager({ initial }: { initial: EmailTemplate[] }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"personal" | "team">("team");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => {
    setEditingId("new");
    setName("");
    setBody("");
    setVisibility("team");
    setToast(null);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setBody(t.body);
    setVisibility(t.visibility);
    setToast(null);
  };

  const cancel = () => {
    setEditingId(null);
    setName("");
    setBody("");
    setVisibility("team");
    setToast(null);
  };

  // Notify the EmailComposer to invalidate its cached templates list so
  // newly-created / edited / deleted templates show up immediately
  // without a page reload.
  const broadcastChange = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("freescale:templates-changed"));
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setToast({ kind: "err", text: "Le nom est requis." });
      return;
    }
    startTransition(async () => {
      if (editingId === "new") {
        const res = await createEmailTemplate({ name: trimmed, body, visibility });
        if (res.ok && res.template) {
          // Push the new template to the top of the list (matches the
          // server's updated_at DESC ordering).
          setTemplates((prev) => [res.template as EmailTemplate, ...prev]);
          broadcastChange();
          setToast({ kind: "ok", text: "Modèle créé." });
          setEditingId(null);
          setName("");
          setBody("");
          setVisibility("team");
        } else {
          setToast({ kind: "err", text: res.error ?? "Création impossible." });
        }
      } else if (editingId) {
        const id = editingId;
        const res = await updateEmailTemplate({ id, name: trimmed, body, visibility });
        if (res.ok) {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === id
                ? { ...t, name: trimmed, body, visibility, updatedAt: new Date().toISOString() }
                : t
            )
          );
          broadcastChange();
          setToast({ kind: "ok", text: "Modèle mis à jour." });
          setEditingId(null);
          setName("");
          setBody("");
          setVisibility("team");
        } else {
          setToast({ kind: "err", text: res.error ?? "Mise à jour impossible." });
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      // Auto-clear the confirm after 4s so an abandoned click doesn't sit
      // armed forever.
      setTimeout(() => setConfirmDelete((curr) => (curr === id ? null : curr)), 4000);
      return;
    }
    startTransition(async () => {
      const res = await deleteEmailTemplate(id);
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        broadcastChange();
        setConfirmDelete(null);
        if (editingId === id) cancel();
      } else {
        setToast({ kind: "err", text: res.error ?? "Suppression impossible." });
      }
    });
  };

  return (
    <div className="settings-section">
      <header className="settings-head">
        <h1>Modèles de réponse</h1>
        <p>
          Snippets prêts à insérer en un clic dans le composer. Le modèle remplace votre brouillon
          en cours mais conserve votre signature.
        </p>
        <p className="settings-vars-hint">
          Variables disponibles dans le corps : <code>{"{{firstName}}"}</code> ·{" "}
          <code>{"{{lastName}}"}</code> · <code>{"{{fullName}}"}</code> · <code>{"{{date}}"}</code>{" "}
          · <code>{"{{time}}"}</code>
        </p>
      </header>

      <div className="settings-card">
        <div className="templates-list">
          {templates.length === 0 && editingId !== "new" && (
            <div className="templates-empty">
              <p>Aucun modèle pour l&apos;instant.</p>
            </div>
          )}

          {templates.map((t) => (
            <div key={t.id} className="template-row">
              {editingId === t.id ? (
                <div className="template-edit">
                  <input
                    className="settings-input"
                    placeholder="Nom du modèle (ex. Demande de démo)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                  />
                  <textarea
                    className="settings-input settings-textarea"
                    rows={6}
                    placeholder="Corps du modèle…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <label className="template-visibility">
                    <span>Visibilité</span>
                    <select
                      className="settings-input"
                      value={visibility}
                      onChange={(event) =>
                        setVisibility(event.target.value === "personal" ? "personal" : "team")
                      }
                    >
                      <option value="team">Équipe</option>
                      <option value="personal">Personnel</option>
                    </select>
                  </label>
                  <div className="template-actions">
                    <button
                      type="button"
                      className="set-btn set-btn-quiet"
                      onClick={cancel}
                      disabled={pending}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="set-btn set-btn-primary"
                      onClick={handleSave}
                      disabled={pending}
                    >
                      {pending ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="template-display">
                  <div className="template-meta">
                    <span className="template-name">
                      {t.name}
                      <small className="template-scope">
                        {t.visibility === "personal" ? "Personnel" : "Équipe"}
                      </small>
                    </span>
                    <span className="template-preview">
                      {t.body.replace(/\s+/g, " ").slice(0, 90) || "Modèle vide"}
                    </span>
                  </div>
                  <div className="template-actions">
                    <button
                      type="button"
                      className="set-btn set-btn-quiet"
                      onClick={() => openEdit(t)}
                    >
                      Éditer
                    </button>
                    <button
                      type="button"
                      className={`set-btn set-btn-quiet ${
                        confirmDelete === t.id ? "set-btn-danger" : ""
                      }`}
                      onClick={() => handleDelete(t.id)}
                      disabled={pending}
                    >
                      {confirmDelete === t.id ? "Confirmer ?" : "Supprimer"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editingId === "new" && (
            <div className="template-row">
              <div className="template-edit">
                <input
                  className="settings-input"
                  placeholder="Nom du modèle (ex. Demande de démo)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
                <textarea
                  className="settings-input settings-textarea"
                  rows={6}
                  placeholder="Corps du modèle… (la signature sera conservée à l'insertion)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <label className="template-visibility">
                  <span>Visibilité</span>
                  <select
                    className="settings-input"
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(event.target.value === "personal" ? "personal" : "team")
                    }
                  >
                    <option value="team">Équipe</option>
                    <option value="personal">Personnel</option>
                  </select>
                </label>
                <div className="template-actions">
                  <button
                    type="button"
                    className="set-btn set-btn-quiet"
                    onClick={cancel}
                    disabled={pending}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="set-btn set-btn-primary"
                    onClick={handleSave}
                    disabled={pending}
                  >
                    {pending ? "Création…" : "Créer le modèle"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-footer">
        {toast && (
          <div className={`settings-toast ${toast.kind === "ok" ? "is-ok" : "is-err"}`}>
            {toast.text}
          </div>
        )}
        {editingId === null && (
          <button type="button" className="set-btn set-btn-primary" onClick={openNew}>
            + Nouveau modèle
          </button>
        )}
      </div>
    </div>
  );
}
