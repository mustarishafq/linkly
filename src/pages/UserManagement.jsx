import { useEffect, useState } from "react";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_TIMEZONE, formatInAppTimezone } from "@/lib/date-time";

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTimezone, setAuditTimezone] = useState(APP_TIMEZONE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logAction, setLogAction] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");

  const loadUsers = async (filters = {}) => {
    setLoading(true);
    setError("");
    try {
      const [userResult, auditResult] = await Promise.all([
        db.admin.listUsers(),
        db.admin.listAuditLogs({ limit: 120, ...filters }),
      ]);
      setUsers(userResult || []);
      setAuditLogs(auditResult?.logs || []);
      setAuditTimezone(auditResult?.timezone || APP_TIMEZONE);
    } catch (err) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers({
      action: logAction,
      search: logSearch,
      from: logFrom ? `${logFrom} 00:00:00` : "",
      to: logTo ? `${logTo} 23:59:59` : "",
    });
  }, []);

  const toggleApproval = async (targetUser) => {
    await db.admin.setApproval(targetUser.id, !targetUser.is_approved);
    await loadUsers();
  };

  const toggleRole = async (targetUser) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    await db.admin.setRole(targetUser.id, nextRole);
    await loadUsers();
  };

  const applyLogFilters = async () => {
    await loadUsers({
      action: logAction,
      search: logSearch,
      from: logFrom ? `${logFrom} 00:00:00` : "",
      to: logTo ? `${logTo} 23:59:59` : "",
    });
  };

  const resetLogFilters = async () => {
    setLogAction("");
    setLogSearch("");
    setLogFrom("");
    setLogTo("");
    await loadUsers();
  };

  if (user?.role !== "admin") {
    return <div className="p-6 text-sm text-slate-600">Admin access required.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">Approve new users before they can login.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Approved</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3">{row.full_name}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{row.role}</td>
                    <td className="px-4 py-3">{row.is_approved ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleApproval(row)}>
                          {row.is_approved ? "Revoke" : "Approve"}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => toggleRole(row)}>
                          Make {row.role === "admin" ? "User" : "Admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">
              Recent Audit Logs (Timezone: {auditTimezone})
            </div>
            <div className="grid grid-cols-1 gap-3 border-b border-border p-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <Input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search actor, target, or email"
                />
              </div>
              <div>
                <select
                  value={logAction}
                  onChange={(e) => setLogAction(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">All actions</option>
                  <option value="user_registered">user_registered</option>
                  <option value="user_approved">user_approved</option>
                  <option value="user_approval_revoked">user_approval_revoked</option>
                  <option value="user_role_changed">user_role_changed</option>
                  <option value="password_reset_requested">password_reset_requested</option>
                  <option value="password_reset_completed">password_reset_completed</option>
                </select>
              </div>
              <div>
                <Input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
              </div>
              <div>
                <Input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyLogFilters}>Filter</Button>
                <Button size="sm" variant="outline" onClick={resetLogFilters}>Reset</Button>
              </div>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Actor</th>
                  <th className="px-4 py-3 text-left font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-4 py-3">{formatInAppTimezone(log.created_date, auditTimezone)}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">
                      <div className="leading-tight">
                        <div>{log.actor_label || log.actor_user_id || "system"}</div>
                        {log.actor_user_id && log.actor_label !== log.actor_user_id && (
                          <div className="text-xs text-muted-foreground">{log.actor_user_id}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="leading-tight">
                        <div>{log.target_label || log.target_user_id || "-"}</div>
                        {log.target_user_id && log.target_label !== log.target_user_id && (
                          <div className="text-xs text-muted-foreground">{log.target_user_id}</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
