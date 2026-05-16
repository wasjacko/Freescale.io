"use client";

import { useRef, useState, useTransition } from "react";
import { savePersonalProfile, uploadAvatar, removeAvatar } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";

type Initial = {
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  email: string;
};

const LANGS = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
];

// Curated short list covering ~95% of EU/US/Asia users. Anything missing can
// still be typed by hand if we promote this to a combobox later.
const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Lisbon",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Athens",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Africa/Casablanca",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

function initialsOf(name: string, fallback: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback[0]?.toUpperCase() ?? "?";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function ProfileForm({ initial }: { initial: Initial }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(initial.fullName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [locale, setLocale] = useState(initial.locale);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdToast, setPwdToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdToast(null);
    if (newPwd.length < 8) {
      setPwdToast({ kind: "err", text: "Au moins 8 caractères." });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdToast({ kind: "err", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setPwdLoading(true);
    try {
      // Re-auth with the current password first (Supabase requires it before
      // updating the password for password-based accounts).
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: initial.email,
        password: currentPwd,
      });
      if (reauthErr) {
        setPwdToast({ kind: "err", text: "Mot de passe actuel incorrect." });
        setPwdLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setPwdToast({ kind: "ok", text: "Mot de passe mis à jour." });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setPwdToast({
        kind: "err",
        text: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const dirty =
    fullName !== initial.fullName ||
    timezone !== initial.timezone ||
    locale !== initial.locale;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await savePersonalProfile({ fullName, timezone, locale });
        setToast({ kind: "ok", text: "Profil enregistré." });
      } catch (err) {
        setToast({
          kind: "err",
          text: err instanceof Error ? err.message : "Échec de l'enregistrement.",
        });
      }
    });
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setToast(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = await uploadAvatar(fd);
      if (url) setAvatarUrl(url);
      setToast({ kind: "ok", text: "Avatar mis à jour." });
    } catch (err) {
      setToast({
        kind: "err",
        text: err instanceof Error ? err.message : "Upload impossible.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeAvatar();
        setAvatarUrl(null);
        setToast({ kind: "ok", text: "Avatar supprimé." });
      } catch (err) {
        setToast({
          kind: "err",
          text: err instanceof Error ? err.message : "Suppression impossible.",
        });
      }
    });
  };

  return (
    <div className="settings-section">
      <header className="settings-head">
        <h1>Profil</h1>
        <p>Le visage que verront vos contacts dans Freescale.</p>
      </header>

      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Avatar</h3>
            <p>PNG, JPG, WEBP ou GIF. 2 Mo max.</p>
          </div>
          <div className="settings-row-control">
            <div className="settings-avatar">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" />
              ) : (
                <span>{initialsOf(fullName, initial.email)}</span>
              )}
            </div>
            <div className="settings-avatar-actions">
              <button
                type="button"
                className="set-btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || pending}
              >
                {uploading ? "Envoi…" : avatarUrl ? "Remplacer" : "Importer"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  className="set-btn set-btn-quiet"
                  onClick={handleRemove}
                  disabled={uploading || pending}
                >
                  Retirer
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Nom complet</h3>
            <p>Affiché dans le sidebar et auprès des coéquipiers.</p>
          </div>
          <div className="settings-row-control">
            <input
              type="text"
              className="settings-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Wacil Ait"
            />
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Email</h3>
            <p>Identifiant de connexion. Ne peut pas être modifié ici.</p>
          </div>
          <div className="settings-row-control">
            <input
              type="email"
              className="settings-input"
              value={initial.email}
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Fuseau horaire</h3>
            <p>Utilisé pour le calendrier et les rappels.</p>
          </div>
          <div className="settings-row-control">
            <select
              className="settings-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Langue</h3>
            <p>Pour l&apos;interface et les emails envoyés par Mue.</p>
          </div>
          <div className="settings-row-control">
            <select
              className="settings-input"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        {toast && (
          <div className={`settings-toast ${toast.kind === "ok" ? "is-ok" : "is-err"}`}>
            {toast.text}
          </div>
        )}
        <button
          type="button"
          className="set-btn set-btn-primary"
          onClick={handleSave}
          disabled={!dirty || pending}
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      <header className="settings-head">
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Mot de passe
        </h2>
        <p>Changez votre mot de passe. Vous resterez connecté ici, mais déconnecté sur les autres appareils.</p>
      </header>

      <form className="settings-card" onSubmit={handlePasswordChange}>
        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Mot de passe actuel</h3>
          </div>
          <div className="settings-row-control">
            <input
              type="password"
              className="settings-input"
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Nouveau mot de passe</h3>
            <p>Au moins 8 caractères.</p>
          </div>
          <div className="settings-row-control">
            <input
              type="password"
              className="settings-input"
              autoComplete="new-password"
              minLength={8}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Au moins 8 caractères"
              required
            />
          </div>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <div className="settings-row-label">
            <h3>Confirmer</h3>
          </div>
          <div className="settings-row-control">
            <input
              type="password"
              className="settings-input"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Retapez le nouveau mot de passe"
              required
            />
          </div>
        </div>
        <div className="settings-row" style={{ paddingTop: 0 }}>
          <div />
          <div className="settings-row-control" style={{ justifyContent: "flex-end", width: "100%" }}>
            {pwdToast && (
              <div className={`settings-toast ${pwdToast.kind === "ok" ? "is-ok" : "is-err"}`}>
                {pwdToast.text}
              </div>
            )}
            <button
              type="submit"
              className="set-btn set-btn-primary"
              disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
            >
              {pwdLoading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
