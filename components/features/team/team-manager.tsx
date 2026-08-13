"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Users, CheckCircle2, Loader2, Plus, Trash2, ShieldCheck } from "@/components/ui/icons";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import type { TeamInvitation, TeamMember } from "@layerflow/contracts";
import { teamService } from "@/lib/services/team";
import { doodleForName } from "@/lib/doodles";
import { timeAgo } from "@/lib/data/providers";

function RoleBadge({ role }: { role: string }) {
  if (role === "owner") return <Badge tone="amber">Owner</Badge>;
  if (role === "admin") return <Badge tone="mint">Admin</Badge>;
  return <Badge tone="neutral">Member</Badge>;
}

export function TeamManager({
  role,
  members,
  invitations,
}: {
  role: "owner" | "admin" | "member";
  members: TeamMember[];
  invitations: TeamInvitation[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    inviteToken ? "Accepting your invitation…" : null,
  );

  const isAdmin = role === "owner" || role === "admin";

  async function acceptInvite() {
    if (!inviteToken) return;
    setBusy(true);
    try {
      const res = await teamService.accept(inviteToken);
      setNotice(`Welcome to ${res.workspaceName}! You're now a member.`);
      router.replace("/team");
      router.refresh();
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Could not accept the invitation");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await teamService.invite({ email: email.trim(), role: inviteRole });
      setEmail("");
      setNotice(`Invitation sent to ${email.trim()}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the invitation");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: TeamMember) {
    setBusy(true);
    setError(null);
    try {
      await teamService.updateRole(member.id, member.role === "admin" ? "member" : "admin");
      setNotice(`Role updated for ${member.name ?? member.email}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the role");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member: TeamMember) {
    setBusy(true);
    setError(null);
    try {
      await teamService.remove(member.id);
      setNotice(`${member.name ?? member.email} removed from the workspace.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the member");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(inv: TeamInvitation) {
    setBusy(true);
    setError(null);
    try {
      await teamService.revoke(inv.id);
      setNotice(`Invitation to ${inv.email} revoked.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke the invitation");
    } finally {
      setBusy(false);
    }
  }

  if (inviteToken) {
    void acceptInvite();
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-mint/30 bg-mint/10 px-4 py-3 text-[13px] font-medium text-mint">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] font-medium text-rose-400">
          {error}
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Members"
          description={`${members.length} in this workspace`}
          action={<Users className="h-4 w-4 text-faint" />}
        />
        <PanelBody className="p-0">
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <Avatar
                  src={member.name ? doodleForName(member.name) : undefined}
                  initials={(member.name ?? member.email ?? "?").slice(0, 2).toUpperCase()}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {member.name ?? "Unnamed"}
                    </p>
                    <RoleBadge role={member.role} />
                    {member.role === "owner" ? (
                      <span className="hidden items-center gap-1 text-[10px] text-faint sm:inline-flex">
                        <ShieldCheck className="h-3 w-3" /> Workspace owner
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-faint">
                    {member.email} · joined {timeAgo(member.createdAt)}
                  </p>
                </div>
                {isAdmin && member.role !== "owner" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void changeRole(member)}
                    >
                      {member.role === "admin" ? "Demote" : "Make admin"}
                    </Button>
                    <IconButton
                      label={`Remove ${member.name ?? member.email}`}
                      onClick={() => void removeMember(member)}
                      disabled={busy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Pending invitations"
          description="Invites expire after 7 days"
          action={<Mail className="h-4 w-4 text-faint" />}
        />
        <PanelBody className="p-0">
          {invitations.length > 0 ? (
            <ul className="divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                  <Mail className="h-4 w-4 text-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{inv.email}</p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {inv.role} · invited {timeAgo(inv.createdAt)}
                    </p>
                  </div>
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void revokeInvitation(inv)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-xs text-faint">No pending invitations.</p>
          )}
        </PanelBody>
      </Panel>

      {isAdmin ? (
        <Panel>
          <PanelHeader title="Invite a teammate" description="They'll get an email with an accept link" />
          <PanelBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Email">
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendInvite();
                  }}
                />
              </Field>
            </div>
            <Field label="Role">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="workspace-input appearance-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Button
              size="sm"
              disabled={busy || !email.trim()}
              onClick={() => void sendInvite()}
              icon={busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            >
              Send invite
            </Button>
          </PanelBody>
        </Panel>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-faint">
          Only owners and admins can invite or manage members.
        </p>
      )}
    </div>
  );
}
