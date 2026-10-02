import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/layout/PageHeader";
import BackButton from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import UserSelect from "@/components/teams/UserSelect";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { UserAvatar } from "@/components/admin/AdminUserShared";

function TeamDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function NameDialog({ title, initialName, confirmTitle, confirmLabel, onClose, onSave }) {
  const [name, setName] = useState(initialName);
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();

  function promptSave(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Team name must be at least 2 characters");
      return;
    }

    requestConfirm({
      title: confirmTitle,
      description: `The team will be named “${trimmed}”.`,
      confirmLabel,
      onConfirm: () => onSave(trimmed),
    });
  }

  return (
    <>
      <FormDialog onClose={onClose} title={title} icon={Pencil} maxWidth="sm">
        <form onSubmit={promptSave}>
          <FormDialogBody className="space-y-2">
            <Label htmlFor="rename-team">Team name</Label>
            <Input
              id="rename-team"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
            />
          </FormDialogBody>
          <FormDialogFooter>
            <Button type="button" variant="outline" className="h-10 flex-1 sm:flex-none sm:min-w-28" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="h-10 flex-1 sm:flex-none sm:min-w-28">
              Continue
            </Button>
          </FormDialogFooter>
        </form>
      </FormDialog>
      {confirmDialog}
    </>
  );
}

function AddMemberDialog({ teamName, existingIds, onClose, onAdd }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    let cancelled = false;
    db.teams.memberOptions()
      .then((rows) => {
        if (!cancelled) setUsers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const available = useMemo(
    () => users.filter((user) => !existingIds.some((id) => String(id) === String(user.id))),
    [users, existingIds]
  );
  const selected = available.find((user) => String(user.id) === userId);

  function promptAdd(event) {
    event.preventDefault();
    if (!selected) {
      toast.error("Select a user");
      return;
    }

    requestConfirm({
      title: "Add teammate?",
      description: `${selected.full_name || selected.email} will be able to view records owned by people on ${teamName}. They still cannot edit or delete someone else’s records.`,
      confirmLabel: "Add member",
      onConfirm: () => onAdd(selected.email),
    });
  }

  return (
    <>
      <FormDialog onClose={onClose} title="Add member" icon={UserPlus} maxWidth="md">
        <form onSubmit={promptAdd}>
          <FormDialogBody className="space-y-2">
            <Label htmlFor="member-user">User</Label>
            <UserSelect
              id="member-user"
              users={available}
              loading={loadingUsers}
              value={userId}
              onSelect={(user) => setUserId(String(user.id))}
            />
          </FormDialogBody>
          <FormDialogFooter>
            <Button type="button" variant="outline" className="h-10 flex-1 sm:flex-none sm:min-w-28" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="h-10 flex-1 sm:flex-none sm:min-w-28">
              Continue
            </Button>
          </FormDialogFooter>
        </form>
      </FormDialog>
      {confirmDialog}
    </>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function loadTeam() {
    try {
      const row = await db.teams.get(id);
      setTeam(row);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadTeam();
  }, [id]);

  async function renameTeam(name) {
    try {
      const updated = await db.teams.rename(id, name);
      setTeam(updated);
      setShowRename(false);
      toast.success("Team renamed");
    } catch (error) {
      toast.error(error?.message || "Failed to rename team");
    }
  }

  async function addMember(email) {
    try {
      const updated = await db.teams.addMember(id, email);
      setTeam(updated);
      setShowAdd(false);
      toast.success(`Added ${email}`);
    } catch (error) {
      toast.error(error?.message || "Failed to add member");
    }
  }

  function promptRemove(member) {
    const isSelf = String(member.id) === String(user?.id);
    requestConfirm({
      title: isSelf ? "Leave team?" : `Remove ${member.full_name || member.email}?`,
      description: isSelf
        ? "You will only see your own records again."
        : "They will no longer see this team’s shared records.",
      confirmLabel: isSelf ? "Leave team" : "Remove",
      destructive: true,
      onConfirm: async () => {
        try {
          await db.teams.removeMember(id, member.id);
          if (isSelf) {
            toast.success("You left the team");
            navigate("/teams");
            return;
          }
          toast.success("Member removed");
          await loadTeam();
        } catch (error) {
          toast.error(error?.message || "Failed to update membership");
        }
      },
    });
  }

  function promptDelete() {
    requestConfirm({
      title: "Delete team?",
      description: `“${team?.name}” will be removed. Members go back to seeing only their own records.`,
      confirmLabel: "Delete team",
      destructive: true,
      onConfirm: async () => {
        try {
          await db.teams.remove(id);
          toast.success("Team deleted");
          navigate("/teams");
        } catch (error) {
          toast.error(error?.message || "Failed to delete team");
        }
      },
    });
  }

  if (loading) {
    return <TeamDetailSkeleton />;
  }

  if (notFound || !team) {
    return (
      <div className="space-y-4">
        <BackButton fallback="/teams" label="Back to teams" />
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium">Team not found</p>
          <p className="text-xs text-muted-foreground mt-1">
            It may have been deleted, or you are not a member.
          </p>
        </div>
      </div>
    );
  }

  const isOwner = team.my_role === "owner";

  return (
    <div className="space-y-6">
      <BackButton fallback="/teams" label="Back to teams" />
      <PageHeader
        icon={UsersRound}
        title={team.name}
        description="Members can view each other’s links, campaigns, domains, and link trees. Editing stays with the record owner."
        action={
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            {isOwner && (
              <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => setShowRename(true)}>
                <Pencil className="h-4 w-4" />
                Rename
              </Button>
            )}
            {isOwner ? (
              <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={promptDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => promptRemove({ id: user?.id, email: user?.email, full_name: user?.full_name })}
              >
                Leave team
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Members</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {team.member_count} {team.member_count === 1 ? "person" : "people"}
            </p>
          </div>
          {isOwner && (
            <Button className="w-full sm:w-auto gap-2" onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          )}
        </div>
        <div className="divide-y divide-border">
          {(team.members || []).map((member) => {
            const isSelf = String(member.id) === String(user?.id);
            const canRemove = member.role !== "owner" && (isOwner || isSelf);
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <UserAvatar user={member} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {member.full_name || member.email}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                  {member.role === "owner" ? "Owner" : "Member"}
                </Badge>
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => promptRemove(member)}
                  >
                    {isSelf ? "Leave" : "Remove"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showRename && (
        <NameDialog
          title="Rename team"
          initialName={team.name}
          confirmTitle="Rename team?"
          confirmLabel="Rename"
          onClose={() => setShowRename(false)}
          onSave={renameTeam}
        />
      )}
      {showAdd && (
        <AddMemberDialog
          teamName={team.name}
          existingIds={(team.members || []).map((member) => member.id)}
          onClose={() => setShowAdd(false)}
          onAdd={addMember}
        />
      )}
      {confirmDialog}
    </div>
  );
}
