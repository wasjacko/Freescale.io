"use client";

import { useState } from "react";
import { useToast } from "@/lib/hooks/useToast";
import { deleteMyAccount } from "@/lib/actions/delete-account";

/**
 * GDPR right-to-be-forgotten flow.
 *
 * Two-step confirmation (modal-on-modal) to avoid accidental clicks:
 *   1. User clicks "Supprimer mon compte" → modal opens listing what
 *      gets wiped + a "type DELETE to confirm" input.
 *   2. User types DELETE + clicks the red final button → server action
 *      fires. On success → hard navigation to /sign-in?deleted=1 so the
 *      browser starts fresh with no stale React Server Component cache.
 */
export function DangerZone({ email }: { email: string }) {
  const push = useToast((s) => s.push);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isConfirmed = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    try {
      const res = await deleteMyAccount();
      if (!res.ok) {
        push({
          text: `Suppression impossible : ${res.error ?? "erreur inconnue"}`,
          duration: 5000,
        });
        setDeleting(false);
        return;
      }
      // Hard navigation (not router.push) so we get a clean RSC tree
      // with the now-invalid session evicted.
      window.location.href = "/sign-in?deleted=1";
    } catch (err) {
      push({
        text: err instanceof Error ? err.message : "Suppression impossible.",
        duration: 5000,
      });
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="danger-zone" aria-labelledby="danger-zone-title">
        <h2 id="danger-zone-title" className="danger-zone-title">
          Zone dangereuse
        </h2>
        <p className="danger-zone-text">
          Supprime définitivement ton compte Freescale et toutes les données
          associées (conversations, messages, contacts, comptes Gmail
          connectés, tâches). Cette action est irréversible.
        </p>
        <button
          type="button"
          className="danger-zone-btn"
          onClick={() => setOpen(true)}
        >
          Supprimer mon compte
        </button>
      </section>

      {open && (
        <div
          className="danger-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="danger-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setOpen(false);
          }}
        >
          <div className="danger-modal">
            <h3 id="danger-modal-title" className="danger-modal-title">
              Supprimer votre compte ?
            </h3>
            <p className="danger-modal-sub">
              Le compte <strong>{email}</strong> et toutes ses données vont
              être supprimées définitivement. Cela inclut :
            </p>
            <ul className="danger-modal-list">
              <li>Tous vos workspaces et conversations</li>
              <li>Tous vos messages et contacts</li>
              <li>Tous vos comptes Gmail connectés (jetons effacés)</li>
              <li>Toutes vos tâches et évènements</li>
              <li>Votre profil et préférences</li>
            </ul>
            <p className="danger-modal-warn">
              Cette action est <strong>immédiate et irréversible</strong>.
              Aucun backup n'est conservé.
            </p>

            <label className="danger-modal-confirm">
              <span>
                Tapez <strong>DELETE</strong> pour confirmer
              </span>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                disabled={deleting}
                spellCheck={false}
                autoComplete="off"
              />
            </label>

            <div className="danger-modal-actions">
              <button
                type="button"
                className="danger-modal-cancel"
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="danger-modal-confirm-btn"
                onClick={handleDelete}
                disabled={!isConfirmed || deleting}
              >
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
