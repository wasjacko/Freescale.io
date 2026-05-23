"use client";

import {
  type TeamSettingsData,
  createWorkspace,
  inviteTeammate,
  markTeamNotificationRead,
  removeTeamMember,
  switchWorkspace,
  updateMemberRole,
  updateTeamNotifications,
  updateWorkspacePermissions,
} from "@/lib/actions/collaboration";
import type { MemberRole } from "@/lib/collaboration";
import { useToast } from "@/lib/hooks/useToast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamSettings({ initial }: { initial: TeamSettingsData }) {
  const router = useRouter();
  const push = useToast((s) => s.push);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(
    initial.notifications.slackWebhookUrl ?? ""
  );
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(
    initial.notifications.emailDigestEnabled
  );
  const [permissionRules, setPermissionRules] = useState(initial.permissionRules);
  const [pending, setPending] = useState<string | null>(null);

  const currentWorkspace = initial.workspaces.find((w) => w.id === initial.activeWorkspaceId);

  const refresh = () => {
    router.refresh();
  };

  const handleCreateWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("workspace");
    const result = await createWorkspace({ name: workspaceName });
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Workspace impossible." });
      return;
    }
    setWorkspaceName("");
    push({ kind: "success", text: "Workspace créé." });
    refresh();
  };

  const handleSwitch = async (workspaceId: string) => {
    setPending(`switch-${workspaceId}`);
    const result = await switchWorkspace({ workspaceId });
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Switch impossible." });
      return;
    }
    refresh();
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("invite");
    const result = await inviteTeammate({ email: inviteEmail, role: inviteRole });
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Invitation impossible." });
      return;
    }
    setInviteEmail("");
    setInviteRole("member");
    setInviteLink(result.inviteLink);
    push({
      kind: "success",
      text: result.emailSent ? "Invitation envoyée par email." : "Lien d'invitation créé.",
    });
    refresh();
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    push({ kind: "info", text: "Lien copié." });
  };

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    setPending(`role-${userId}`);
    const result = await updateMemberRole({ userId, role });
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Rôle impossible." });
      return;
    }
    refresh();
  };

  const handleRemove = async (userId: string) => {
    setPending(`remove-${userId}`);
    const result = await removeTeamMember({ userId });
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Suppression impossible." });
      return;
    }
    refresh();
  };

  const handleNotifications = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("notifications");
    const result = await updateTeamNotifications({ slackWebhookUrl, emailDigestEnabled });
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Notifications impossibles." });
      return;
    }
    push({ kind: "success", text: "Notifications équipe mises à jour." });
    refresh();
  };

  const handleNotificationRead = async (notificationId: string) => {
    setPending(`notice-${notificationId}`);
    const result = await markTeamNotificationRead(notificationId);
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Notification impossible." });
      return;
    }
    refresh();
  };

  const toggleRule = (
    key: "inviteRoles" | "connectChannelRoles" | "assignRoles",
    role: MemberRole
  ) => {
    setPermissionRules((current) => {
      const enabled = current[key].includes(role);
      return {
        ...current,
        [key]: enabled ? current[key].filter((value) => value !== role) : [...current[key], role],
      };
    });
  };

  const handlePermissions = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("permissions");
    const result = await updateWorkspacePermissions(permissionRules);
    setPending(null);
    if (!result.ok) {
      push({ kind: "error", text: result.error ?? "Permissions impossibles." });
      return;
    }
    push({ kind: "success", text: "Permissions équipe mises à jour." });
    refresh();
  };

  return (
    <div className="settings-stack">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h1>Équipe</h1>
            <p>Workspaces, rôles, invitations et garde-fous de collaboration.</p>
          </div>
          <span className="settings-pill">{initial.currentRole ?? "member"}</span>
        </div>

        <div className="team-workspace-grid">
          <div className="team-workspace-list">
            {initial.workspaces.map((workspace) => (
              <button
                type="button"
                key={workspace.id}
                className={`team-workspace-row ${
                  workspace.id === initial.activeWorkspaceId ? "is-active" : ""
                }`}
                onClick={() => void handleSwitch(workspace.id)}
                disabled={pending === `switch-${workspace.id}`}
              >
                <span>
                  <strong>{workspace.name}</strong>
                  <small>{workspace.role}</small>
                </span>
                {workspace.id === initial.activeWorkspaceId ? <b>Actif</b> : <b>Switch</b>}
              </button>
            ))}
          </div>

          <form className="team-create-form" onSubmit={handleCreateWorkspace}>
            <label>
              Nouveau workspace
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Agence, studio, client..."
                maxLength={64}
              />
            </label>
            <button type="submit" disabled={pending === "workspace" || !workspaceName.trim()}>
              Créer
            </button>
          </form>
        </div>
      </section>

      {initial.notificationsForMe.length > 0 && (
        <section className="settings-card">
          <div className="settings-card-head">
            <div>
              <h2>Activité pour vous</h2>
              <p>Mentions et conversations qui vous sont assignées.</p>
            </div>
            <span className="settings-pill">
              {initial.notificationsForMe.filter((notice) => !notice.readAt).length} non lue(s)
            </span>
          </div>

          <div className="team-notice-list">
            {initial.notificationsForMe.map((notice) => (
              <div key={notice.id} className={`team-notice-row ${notice.readAt ? "is-read" : ""}`}>
                <span className={`team-notice-kind is-${notice.kind}`}>
                  {notice.kind === "mention" ? "Mention" : "Assignation"}
                </span>
                <div>
                  <strong>{notice.body}</strong>
                  <small>
                    {new Date(notice.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                </div>
                {!notice.readAt && (
                  <button
                    type="button"
                    disabled={pending === `notice-${notice.id}`}
                    onClick={() => void handleNotificationRead(notice.id)}
                  >
                    Marquer lue
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Membres</h2>
            <p>
              {currentWorkspace?.name ?? "Workspace"} · {initial.members.length} membre(s)
            </p>
          </div>
        </div>

        <form className="team-invite-form" onSubmit={handleInvite}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@company.com"
            disabled={!initial.permissions.canInvite}
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as MemberRole)}
            disabled={!initial.permissions.canInvite}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={pending === "invite" || !inviteEmail.trim() || !initial.permissions.canInvite}
          >
            Inviter
          </button>
        </form>

        {inviteLink && (
          <button type="button" className="team-invite-link" onClick={handleCopyInvite}>
            Copier le lien d'invitation
          </button>
        )}

        <div className="team-member-list">
          {initial.members.map((member) => (
            <div key={member.userId} className="team-member-row">
              <span className="team-avatar" aria-hidden>
                {(member.fullName || member.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="team-member-main">
                <strong>{member.fullName || member.email}</strong>
                <small>{member.email}</small>
              </span>
              <select
                value={member.role}
                disabled={!initial.permissions.canManageWorkspace || member.role === "owner"}
                onChange={(event) =>
                  handleRoleChange(member.userId, event.target.value as MemberRole)
                }
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <button
                type="button"
                disabled={
                  !initial.permissions.canManageWorkspace ||
                  member.role === "owner" ||
                  pending === `remove-${member.userId}`
                }
                onClick={() => handleRemove(member.userId)}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>

        {initial.invites.length > 0 && (
          <div className="team-pending-list">
            <h3>Invitations en attente</h3>
            {initial.invites
              .filter((invite) => !invite.acceptedAt)
              .map((invite) => (
                <div key={invite.id} className="team-pending-row">
                  <span>{invite.email}</span>
                  <small>
                    {invite.role} · expire {new Date(invite.expiresAt).toLocaleDateString()}
                  </small>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Notifications & permissions</h2>
            <p>
              Les owners/admins peuvent inviter et connecter les canaux. Les membres peuvent traiter
              les conversations.
            </p>
          </div>
        </div>

        <form className="team-notification-form" onSubmit={handleNotifications}>
          <label>
            Slack webhook
            <input
              value={slackWebhookUrl}
              onChange={(event) => setSlackWebhookUrl(event.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </label>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={emailDigestEnabled}
              onChange={(event) => setEmailDigestEnabled(event.target.checked)}
            />
            <span>Envoyer les notifications équipe par digest email</span>
          </label>
          <button type="submit" disabled={pending === "notifications"}>
            Enregistrer
          </button>
        </form>

        <div className="team-permission-grid">
          <span>Inviter</span>
          <strong>{initial.permissions.canInvite ? "Autorisé" : "Bloqué"}</strong>
          <span>Connecter canaux</span>
          <strong>{initial.permissions.canConnectChannels ? "Autorisé" : "Bloqué"}</strong>
          <span>Assigner conversations</span>
          <strong>{initial.permissions.canAssignConversation ? "Autorisé" : "Bloqué"}</strong>
        </div>

        <form className="team-rules-form" onSubmit={handlePermissions}>
          <h3>Accès par rôle</h3>
          {(
            [
              ["inviteRoles", "Inviter des membres"],
              ["connectChannelRoles", "Connecter des canaux"],
              ["assignRoles", "Assigner des conversations"],
            ] as const
          ).map(([key, label]) => (
            <div className="team-rule-row" key={key}>
              <span>{label}</span>
              <label className="settings-check">
                <input type="checkbox" checked disabled />
                <span>Owner</span>
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={permissionRules[key].includes("admin")}
                  onChange={() => toggleRule(key, "admin")}
                  disabled={!initial.permissions.canManageWorkspace}
                />
                <span>Admin</span>
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={permissionRules[key].includes("member")}
                  onChange={() => toggleRule(key, "member")}
                  disabled={!initial.permissions.canManageWorkspace}
                />
                <span>Member</span>
              </label>
            </div>
          ))}
          {initial.permissions.canManageWorkspace && (
            <button type="submit" disabled={pending === "permissions"}>
              Enregistrer les permissions
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
