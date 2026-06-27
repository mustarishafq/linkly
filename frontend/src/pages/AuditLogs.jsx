import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  startOfDay,
} from "date-fns";
import {
  Shield,
  ScrollText,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Activity,
  CalendarDays,
  RefreshCw,
  Copy,
  Users,
} from "lucide-react";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";
import { APP_TIMEZONE, formatInAppTimezone } from "@/lib/date-time";
import {
  AUDIT_CATEGORIES,
  AUDIT_ACTIONS,
  buildActionCounts,
  filterActionsByCategory,
  getActionCategory,
  getActionVisual,
  getAuditDetailRows,
  getAuditSummary,
  getAuditTitle,
  CATEGORY_STYLES,
  shouldShowActorTargetFlow,
} from "@/lib/auditLogVisuals";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { UserAvatar } from "@/components/admin/AdminUserShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CollapsibleFilters from "@/components/ui/collapsible-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

const PAGE_SIZE = 25;

function getDateGroupLabel(date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

function groupLogsByDate(logs) {
  const groups = [];
  let currentKey = null;

  for (const log of logs) {
    const date = new Date(log.created_date);
    const key = startOfDay(date).toISOString();
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ key, label: getDateGroupLabel(date), logs: [] });
    }
    groups[groups.length - 1].logs.push(log);
  }

  return groups;
}

function AuditLogsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  );
}

function FlowChip({ name, hint }) {
  const isSystem = name === "system";

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-[200px]">
      {isSystem ? (
        <div className="h-7 w-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      ) : (
        <UserAvatar user={name} size="xs" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate leading-tight">{name}</p>
        {hint && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{hint}</p>
        )}
      </div>
    </div>
  );
}

function AuditFlowBar({ log }) {
  const details = log.details || {};
  const actor = log.actor_label || log.actor_user_id || "system";
  const target = log.target_label || log.target_user_id;
  const targetHint = details.email && details.email !== target ? details.email : null;

  return (
    <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 overflow-x-auto">
      <FlowChip name={actor} />
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      <FlowChip name={target} hint={targetHint} />
    </div>
  );
}

function ActionBreakdown({ actionCounts, activeAction, onSelect, maxItems = 8 }) {
  const items = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);

  if (!items.length) return null;

  const maxCount = items[0][1];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Event breakdown
      </p>
      <div className="space-y-2">
        {items.map(([action, count]) => {
          const visual = getActionVisual(action);
          const Icon = visual.icon;
          const width = maxCount > 0 ? Math.max(8, (count / maxCount) * 100) : 0;

          return (
            <button
              key={action}
              type="button"
              onClick={() => onSelect(activeAction === action ? "" : action)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2 transition-colors",
                activeAction === action
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/70 bg-card hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="flex items-center gap-2 text-xs font-medium min-w-0">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{visual.label}</span>
                </span>
                <Badge variant="secondary" className="font-normal text-[10px] shrink-0">
                  {count}
                </Badge>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AuditLogEntry({ log, timezone }) {
  const [open, setOpen] = useState(false);
  const visual = getActionVisual(log.action);
  const Icon = visual.icon;
  const title = getAuditTitle(log);
  const summary = getAuditSummary(log);
  const detailRows = getAuditDetailRows(log);
  const logDate = new Date(log.created_date);
  const category = getActionCategory(log.action);
  const showFlow = shouldShowActorTargetFlow(log);
  const categoryStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.other;

  const copyEventId = async () => {
    try {
      await navigator.clipboard.writeText(log.id);
      toast.success("Event ID copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-xl border transition-all duration-200 overflow-hidden",
          open
            ? "border-border bg-card shadow-sm"
            : "border-border/80 bg-card hover:border-border hover:shadow-sm"
        )}
      >
        <div className="p-3 sm:p-4">
          <div className="flex gap-3">
            <div
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                visual.className
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold leading-snug">{title}</p>
                    {category !== "other" && (
                      <Badge
                        variant="outline"
                        className={cn("font-normal text-[10px] capitalize border", categoryStyle)}
                      >
                        {category}
                      </Badge>
                    )}
                  </div>
                  {summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
                  )}
                </div>

                <div className="text-right shrink-0 pt-0.5">
                  <p className="text-xs font-semibold tabular-nums text-foreground">
                    {format(logDate, "HH:mm:ss")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                    {formatDistanceToNow(logDate, { addSuffix: true })}
                  </p>
                </div>
              </div>

              {showFlow && <AuditFlowBar log={log} />}

              <div className="flex items-center gap-1 pt-0.5 border-t border-border/40">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px] text-muted-foreground px-2 -ml-2"
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                    />
                    Details
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[11px] text-muted-foreground px-2"
                  onClick={copyEventId}
                >
                  <Copy className="h-3 w-3" />
                  Copy ID
                </Button>
              </div>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border/60 px-4 sm:px-5 py-3 sm:py-4 bg-muted/15 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 bg-background/90 px-3 py-2.5">
                <p className="text-[10px] font-medium text-muted-foreground">Timestamp</p>
                <p className="text-xs font-medium tabular-nums mt-1">
                  {formatInAppTimezone(log.created_date, timezone)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/90 px-3 py-2.5">
                <p className="text-[10px] font-medium text-muted-foreground">Action</p>
                <p className="text-xs font-mono mt-1">{log.action}</p>
              </div>
            </div>

            {detailRows.length > 0 && (
              <div className="rounded-lg border border-border/60 overflow-hidden bg-background/90">
                {detailRows.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className={cn(
                      "grid grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] gap-3 px-3 py-2 text-xs",
                      index > 0 && "border-t border-border/50"
                    )}
                  >
                    <span className="text-muted-foreground capitalize">{row.label}</span>
                    <span
                      className={cn(
                        "text-foreground break-all text-right sm:text-left",
                        row.mono && "font-mono text-[11px]"
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function AuditLogs() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTimezone, setAuditTimezone] = useState(APP_TIMEZONE);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("all");
  const [logAction, setLogAction] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");

  const buildFilters = (overrides = {}) => ({
    limit: 500,
    action: overrides.action ?? logAction,
    search: overrides.search ?? logSearch,
    from: (overrides.from ?? logFrom) ? `${overrides.from ?? logFrom} 00:00:00` : "",
    to: (overrides.to ?? logTo) ? `${overrides.to ?? logTo} 23:59:59` : "",
  });

  const loadAuditLogs = async (filters = buildFilters(), { initial = false } = {}) => {
    if (initial) setLoading(true);
    else setFiltering(true);
    setError("");

    try {
      const result = await db.admin.listAuditLogs(filters);
      setAuditLogs(result?.logs || []);
      setAuditTimezone(result?.timezone || APP_TIMEZONE);
      setPage(0);
    } catch (err) {
      setError(err?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  useEffect(() => {
    loadAuditLogs(buildFilters(), { initial: true });
  }, []);

  const actionCounts = useMemo(() => buildActionCounts(auditLogs), [auditLogs]);

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const today = auditLogs.filter((l) => new Date(l.created_date) >= todayStart).length;
    const actors = new Set(auditLogs.map((l) => l.actor_user_id).filter(Boolean)).size;
    const security = auditLogs.filter((l) => {
      const cat = getActionCategory(l.action);
      return cat === "auth" || cat === "sso";
    }).length;
    const dataChanges = auditLogs.filter((l) => getActionCategory(l.action) === "data").length;
    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      total: auditLogs.length,
      today,
      actors,
      security,
      dataChanges,
      topActionCount: topAction?.[1] ?? 0,
      topActionLabel: topAction ? getActionVisual(topAction[0]).label : "No events yet",
    };
  }, [auditLogs, actionCounts]);

  const categoryFilteredLogs = useMemo(() => {
    if (category === "all") return auditLogs;
    return auditLogs.filter((log) => getActionCategory(log.action) === category);
  }, [auditLogs, category]);

  const hasLogFilters = Boolean(logAction || logSearch || logFrom || logTo);
  const totalPages = Math.max(1, Math.ceil(categoryFilteredLogs.length / PAGE_SIZE));
  const pagedLogs = categoryFilteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const groupedLogs = useMemo(() => groupLogsByDate(pagedLogs), [pagedLogs]);
  const rangeStart = categoryFilteredLogs.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, categoryFilteredLogs.length);
  const visibleActions = filterActionsByCategory(category);

  const applyLogFilters = () => loadAuditLogs(buildFilters());
  const resetLogFilters = () => {
    setCategory("all");
    setLogAction("");
    setLogSearch("");
    setLogFrom("");
    setLogTo("");
    loadAuditLogs({ limit: 500 });
  };

  const setQuickAction = (action) => {
    setLogAction(action);
    loadAuditLogs(buildFilters({ action }));
  };

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
    setPage(0);
    if (logAction) {
      const actionMeta = AUDIT_ACTIONS.find((a) => a.value === logAction);
      if (nextCategory !== "all" && actionMeta?.category !== nextCategory) {
        setLogAction("");
        loadAuditLogs(buildFilters({ action: "" }));
      }
    }
  };

  function exportCSV() {
    const headers = ["When", "Action", "Category", "Actor", "Target", "Summary", "Event ID"];
    const rows = categoryFilteredLogs.map((log) => [
      formatInAppTimezone(log.created_date, auditTimezone),
      log.action,
      getActionCategory(log.action),
      log.actor_label || log.actor_user_id || "system",
      log.target_label || log.target_user_id || "",
      getAuditSummary(log) || "",
      log.id,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <p className="text-sm font-medium">Admin access required</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          You need administrator privileges to view security audit logs.
        </p>
      </div>
    );
  }

  if (loading) {
    return <AuditLogsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Audit Logs"
        description={`Security events across your workspace · ${auditTimezone}`}
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="gap-2 h-10 sm:h-9"
              onClick={() => loadAuditLogs(buildFilters())}
              disabled={filtering}
            >
              <RefreshCw className={cn("h-4 w-4", filtering && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-10 sm:h-9"
              onClick={exportCSV}
              disabled={categoryFilteredLogs.length === 0}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={ScrollText}
          label="Total Events"
          value={stats.total.toLocaleString()}
          subtitle={hasLogFilters ? "Matching filters" : "Recent history"}
          accent="primary"
          index={0}
        />
        <StatCard
          icon={CalendarDays}
          label="Today"
          value={stats.today.toLocaleString()}
          subtitle="Events since midnight"
          accent="info"
          index={1}
        />
        <StatCard
          icon={Users}
          label="Unique Actors"
          value={stats.actors.toLocaleString()}
          subtitle="Users who performed actions"
          accent="success"
          index={2}
        />
        <StatCard
          icon={Activity}
          label="Data Changes"
          value={stats.dataChanges.toLocaleString()}
          subtitle={`${stats.security} auth & SSO events`}
          accent="warning"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="xl:col-span-4 bg-card rounded-2xl border border-border p-4 shadow-sm"
        >
          <ActionBreakdown
            actionCounts={actionCounts}
            activeAction={logAction}
            onSelect={setQuickAction}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="xl:col-span-8 bg-card rounded-2xl border border-border p-4 shadow-sm"
        >
          <CollapsibleFilters
            contentClassName="space-y-4 pt-4"
            actions={
              hasLogFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={resetLogFilters}
                  disabled={filtering}
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              ) : null
            }
          >
          <Tabs value={category} onValueChange={handleCategoryChange}>
            <TabsList className="w-full h-9 bg-muted/50 overflow-x-auto justify-start">
              {AUDIT_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs shrink-0">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-on-hover">
            {visibleActions.map((opt) => (
              <Button
                key={opt.value || "all"}
                variant={logAction === opt.value ? "default" : "outline"}
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={() => setQuickAction(opt.value)}
                disabled={filtering}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLogFilters()}
                placeholder="Search email, name, action, or ID…"
                className="pl-9"
              />
            </div>

            <Input
              type="date"
              value={logFrom}
              onChange={(e) => setLogFrom(e.target.value)}
              aria-label="From date"
            />

            <Input
              type="date"
              value={logTo}
              onChange={(e) => setLogTo(e.target.value)}
              aria-label="To date"
            />

            <Button
              className="h-9 sm:col-span-2 lg:col-span-1"
              onClick={applyLogFilters}
              disabled={filtering}
            >
              {filtering ? "Applying…" : "Apply filters"}
            </Button>
          </div>
          </CollapsibleFilters>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        {categoryFilteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium">No audit logs found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {hasLogFilters || category !== "all"
                ? "Try adjusting your filters or category."
                : "Security events will appear here as they occur."}
            </p>
            {(hasLogFilters || category !== "all") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={resetLogFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-5 space-y-6">
              {groupedLogs.map((group) => (
                <section key={group.key} className="space-y-2.5">
                  <div className="flex items-center gap-3 sticky top-0 z-[1] bg-card/95 backdrop-blur-sm py-1 -mx-1 px-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-border/80" />
                    <Badge variant="secondary" className="font-normal text-[10px] tabular-nums">
                      {group.logs.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {group.logs.map((log) => (
                      <AuditLogEntry key={log.id} log={log} timezone={auditTimezone} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-4 sm:px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {categoryFilteredLogs.length.toLocaleString()}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums min-w-[80px] text-center">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
