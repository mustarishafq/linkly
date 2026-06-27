import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  MoreHorizontal,
} from "lucide-react";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  UserAvatar,
  RoleBadge,
  ApprovalBadge,
} from "@/components/admin/AdminUserShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function UserManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

function UserRowActions({ user, currentUserId, onToggleApproval, onToggleRole, compact }) {
  const isSelf = user.id === currentUserId;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={user.is_approved ? "outline" : "default"}
          className="h-8 text-xs flex-1 sm:flex-none"
          disabled={isSelf}
          onClick={() => onToggleApproval(user)}
        >
          {user.is_approved ? "Revoke" : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs flex-1 sm:flex-none"
          disabled={isSelf}
          onClick={() => onToggleRole(user)}
        >
          Make {user.role === "admin" ? "User" : "Admin"}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="User actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem disabled={isSelf} onClick={() => onToggleApproval(user)}>
          {user.is_approved ? "Revoke approval" : "Approve user"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSelf} onClick={() => onToggleRole(user)}>
          Make {user.role === "admin" ? "user" : "admin"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const userResult = await db.admin.listUsers();
      setUsers(userResult || []);
    } catch (err) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const approved = users.filter((u) => u.is_approved).length;
    const pending = users.filter((u) => !u.is_approved).length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { total, approved, pending, admins };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const toggleApproval = async (targetUser) => {
    try {
      await db.admin.setApproval(targetUser.id, !targetUser.is_approved);
      toast.success(
        targetUser.is_approved
          ? `Revoked approval for ${targetUser.full_name || targetUser.email}`
          : `Approved ${targetUser.full_name || targetUser.email}`
      );
      await loadUsers();
    } catch (err) {
      toast.error(err?.message || "Failed to update approval");
    }
  };

  const toggleRole = async (targetUser) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      await db.admin.setRole(targetUser.id, nextRole);
      toast.success(
        `${targetUser.full_name || targetUser.email} is now ${nextRole === "admin" ? "an admin" : "a user"}`
      );
      await loadUsers();
    } catch (err) {
      toast.error(err?.message || "Failed to update role");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <p className="text-sm font-medium">Admin access required</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          You need administrator privileges to manage users.
        </p>
      </div>
    );
  }

  if (loading) {
    return <UserManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Users"
        description="Approve new accounts and manage user roles"
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.total.toLocaleString()}
          subtitle={`${filteredUsers.length} shown`}
          accent="primary"
          index={0}
        />
        <StatCard
          icon={UserCheck}
          label="Approved"
          value={stats.approved.toLocaleString()}
          subtitle={
            stats.total > 0
              ? `${Math.round((stats.approved / stats.total) * 100)}% of users`
              : "No users yet"
          }
          accent="success"
          index={1}
        />
        <StatCard
          icon={UserX}
          label="Pending"
          value={stats.pending.toLocaleString()}
          subtitle="Awaiting approval"
          accent="warning"
          index={2}
        />
        <StatCard
          icon={ShieldCheck}
          label="Admins"
          value={stats.admins.toLocaleString()}
          subtitle="With full access"
          accent="info"
          index={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-3 border-b border-border/60">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary shrink-0" />
            All users
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9 h-9"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {userSearch
                ? "Try a different search term."
                : "Registered users will appear here."}
            </p>
            {userSearch && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setUserSearch("")}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-border">
              {filteredUsers.map((row) => {
                const joined = row.created_date ? new Date(row.created_date) : null;

                return (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <UserAvatar user={row} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {row.full_name || "Unnamed user"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                        {joined && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Joined {formatDistanceToNow(joined, { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <RoleBadge role={row.role} />
                      <ApprovalBadge approved={row.is_approved} />
                      {row.id === user?.id && (
                        <Badge variant="outline" className="font-normal text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>

                    <UserRowActions
                      user={row}
                      currentUserId={user?.id}
                      onToggleApproval={toggleApproval}
                      onToggleRole={toggleRole}
                      compact
                    />
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((row) => {
                    const joined = row.created_date ? new Date(row.created_date) : null;

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar user={row} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {row.full_name || "Unnamed user"}
                                </p>
                                {row.id === user?.id && (
                                  <Badge variant="outline" className="font-normal text-[10px] shrink-0">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {row.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell whitespace-nowrap">
                          {joined ? (
                            <div>
                              <p className="text-sm tabular-nums">{format(joined, "MMM d, yyyy")}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(joined, { addSuffix: true })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={row.role} />
                        </TableCell>
                        <TableCell>
                          <ApprovalBadge approved={row.is_approved} />
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <UserRowActions
                            user={row}
                            currentUserId={user?.id}
                            onToggleApproval={toggleApproval}
                            onToggleRole={toggleRole}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
