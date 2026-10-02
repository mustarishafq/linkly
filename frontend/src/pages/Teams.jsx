import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Plus, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import db from "@/api/openClient";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import UserSelect from "@/components/teams/UserSelect";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

function TeamsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

function CreateTeamDialog({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
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
    () => users.filter((user) => !members.some((member) => member.id === user.id)),
    [users, members]
  );

  function promptCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Team name must be at least 2 characters");
      return;
    }

    const names = members.map((member) => member.full_name || member.email);
    const memberLine = names.length
      ? ` ${names.join(", ")} will be added and can view each other’s records.`
      : " You can add members later.";

    requestConfirm({
      title: "Create team?",
      description: `“${trimmed}” will be created.${memberLine}`,
      confirmLabel: "Create team",
      onConfirm: async () => {
        try {
          const team = await db.teams.create(trimmed, members.map((member) => member.id));
          toast.success(`Created ${team.name}`);
          onCreated(team);
        } catch (error) {
          toast.error(error?.message || "Failed to create team");
        }
      },
    });
  }

  return (
    <>
      <FormDialog onClose={onClose} title="Create team" icon={UsersRound} maxWidth="md">
        <form onSubmit={promptCreate}>
          <FormDialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Marketing"
                maxLength={80}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-members">Members</Label>
              <UserSelect
                key={members.map((member) => member.id).join("-") || "none"}
                id="team-members"
                users={available}
                loading={loadingUsers}
                emptyLabel="No more users to add"
                onSelect={(user) => setMembers((current) => [...current, user])}
              />
              {members.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <span
                      key={member.id}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                    >
                      {member.full_name || member.email}
                      <button
                        type="button"
                        className="rounded-sm hover:bg-background/80"
                        aria-label={`Remove ${member.full_name || member.email}`}
                        onClick={() => setMembers((current) => current.filter((row) => row.id !== member.id))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function loadTeams() {
    setError("");
    try {
      const rows = await db.teams.list();
      setTeams(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  if (loading) {
    return <TeamsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersRound}
        title="Teams"
        description="Share a view of links, campaigns, domains, and link trees with your teammates"
        action={
          <Button className="w-full sm:w-auto gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
            <UsersRound className="h-7 w-7 text-primary/60" />
          </div>
          <p className="text-base font-semibold">No teams yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create a team so members can see each other’s details instead of only their own.
          </p>
          <Button className="mt-5 gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
            >
              <Link
                to={`/teams/${team.id}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {team.member_count} {team.member_count === 1 ? "member" : "members"}
                    <span className="text-border"> · </span>
                    {team.my_role === "owner" ? "You own this team" : "You are a member"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeamDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadTeams();
          }}
        />
      )}
    </div>
  );
}
