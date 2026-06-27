import db from "@/api/openClient";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import {
  Plus,
  Route,
  Trash2,
  Globe,
  Smartphone,
  Clock,
  ChevronRight,
  Link2,
  ShieldCheck,
  ExternalLink,
  Search,
  Filter,
  Zap,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import PageHeader from "@/components/layout/PageHeader";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";

const RULE_META = {
  country: {
    label: "Country",
    icon: Globe,
    badge: "bg-info/10 text-info ring-1 ring-info/20",
    iconBg: "bg-info/10",
    iconColor: "text-info",
    accent: "info",
    hint: "e.g. MY, US, SG",
    placeholder: "Country code (MY, US, SG…)",
  },
  device: {
    label: "Device",
    icon: Smartphone,
    badge: "bg-primary/10 text-primary ring-1 ring-primary/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    accent: "primary",
    hint: "e.g. Mobile, Desktop, Tablet",
    placeholder: "Device type (Mobile, Desktop…)",
  },
  schedule: {
    label: "Schedule",
    icon: Clock,
    badge: "bg-warning/10 text-warning ring-1 ring-warning/20",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    accent: "warning",
    hint: "e.g. 09:00-17:00",
    placeholder: "Time range (09:00-17:00)",
  },
};

const TYPE_FILTERS = [
  { id: "all", label: "All types" },
  { id: "country", label: "Country" },
  { id: "device", label: "Device" },
  { id: "schedule", label: "Schedule" },
];

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

function RedirectsSkeleton() {
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

export default function SmartRedirects() {
  const [rules, setRules] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [r, l] = await Promise.all([
      db.entities.RedirectRule.list("-created_date", 200),
      db.entities.ShortLink.list("-created_date", 200),
    ]);
    setRules(r);
    setLinks(l);
    setLoading(false);
  }

  async function deleteRule(id) {
    await db.entities.RedirectRule.delete(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Rule deleted" });
  }

  function promptDeleteRule(rule, link) {
    const linkLabel = link?.title || (link?.slug ? `/${link.slug}` : "this link");
    requestConfirm({
      title: "Delete redirect rule?",
      description: `The ${rule.rule_type} rule for ${linkLabel} will be removed permanently.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => deleteRule(rule.id),
    });
  }

  async function toggleRule(rule) {
    await db.entities.RedirectRule.update(rule.id, { is_active: !rule.is_active });
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    );
  }

  const linkMap = useMemo(() => {
    const map = {};
    links.forEach((l) => (map[l.id] = l));
    return map;
  }, [links]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rules.filter((rule) => {
      const link = linkMap[rule.link_id];
      const matchesSearch =
        !q ||
        rule.condition_value?.toLowerCase().includes(q) ||
        rule.redirect_url?.toLowerCase().includes(q) ||
        link?.slug?.toLowerCase().includes(q) ||
        link?.title?.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || rule.rule_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && rule.is_active) ||
        (statusFilter === "inactive" && !rule.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rules, linkMap, search, typeFilter, statusFilter]);

  if (loading) {
    return <RedirectsSkeleton />;
  }

  const activeRules = rules.filter((r) => r.is_active).length;
  const rulesByType = {
    country: rules.filter((r) => r.rule_type === "country").length,
    device: rules.filter((r) => r.rule_type === "device").length,
    schedule: rules.filter((r) => r.rule_type === "schedule").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Route}
        title="Smart Redirects"
        description="Redirect visitors based on country, device, or schedule"
        action={
          <Button
            className="gap-2 h-10 w-full sm:w-auto sm:h-9 shadow-md shadow-primary/20 hover:shadow-primary/30"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Route}
          label="Total Rules"
          value={rules.length}
          subtitle={`${links.length} links available`}
          accent="primary"
          index={0}
        />
        <StatCard
          icon={ShieldCheck}
          label="Active"
          value={activeRules}
          subtitle={
            rules.length > 0
              ? `${Math.round((activeRules / rules.length) * 100)}% enabled`
              : "No rules yet"
          }
          accent="success"
          index={1}
        />
        <StatCard
          icon={Globe}
          label="Country"
          value={rulesByType.country}
          subtitle="Geo-based rules"
          accent="info"
          index={2}
        />
        <StatCard
          icon={Smartphone}
          label="Device & Time"
          value={rulesByType.device + rulesByType.schedule}
          subtitle={`${rulesByType.device} device · ${rulesByType.schedule} schedule`}
          accent="warning"
          index={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <DashboardWidget
          icon={Route}
          title="Redirect Rules"
          action={
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {filtered.length} of {rules.length}
            </span>
          }
          noPadding
        >
          <div className="px-4 sm:px-5 pb-4 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by slug, condition, or URL…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-secondary/40 border-border/60 focus-visible:ring-primary/30"
              />
            </div>

            <div className="sm:hidden space-y-3">
              <FilterGroup label="Type" showIcon>
                {TYPE_FILTERS.map((filter) => (
                  <FilterPill
                    key={filter.id}
                    active={typeFilter === filter.id}
                    onClick={() => setTypeFilter(filter.id)}
                  >
                    {filter.label}
                  </FilterPill>
                ))}
              </FilterGroup>
              <FilterGroup label="Status">
                {STATUS_FILTERS.map((filter) => (
                  <FilterPill
                    key={filter.id}
                    active={statusFilter === filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                  </FilterPill>
                ))}
              </FilterGroup>
            </div>

            <div className="hidden sm:flex sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {TYPE_FILTERS.map((filter) => (
                    <FilterPill
                      key={filter.id}
                      active={typeFilter === filter.id}
                      onClick={() => setTypeFilter(filter.id)}
                    >
                      {filter.label}
                    </FilterPill>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {STATUS_FILTERS.map((filter) => (
                  <FilterPill
                    key={filter.id}
                    active={statusFilter === filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                  </FilterPill>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              hasFilters={Boolean(search || typeFilter !== "all" || statusFilter !== "all")}
              onCreate={() => setShowForm(true)}
            />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((rule, i) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  link={linkMap[rule.link_id]}
                  index={i}
                  onToggle={() => toggleRule(rule)}
                  onDelete={() => promptDeleteRule(rule, linkMap[rule.link_id])}
                />
              ))}
            </div>
          )}
        </DashboardWidget>
      </motion.div>

      {showForm && (
        <RedirectRuleForm links={links} onClose={() => setShowForm(false)} onSaved={loadData} />
      )}

      {confirmDialog}
    </div>
  );
}

function FilterGroup({ label, showIcon, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {showIcon ? (
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" aria-hidden />
        )}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="relative -mx-4 px-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x snap-x snap-mandatory">
          {children}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 snap-start rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
          : "bg-secondary/60 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ hasFilters, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
        <Route className="h-7 w-7 text-primary/60" />
      </div>
      <p className="text-base font-semibold">
        {hasFilters ? "No rules match your filters" : "No redirect rules yet"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        {hasFilters
          ? "Try adjusting your search or filters"
          : "Create smart rules to redirect visitors based on location, device, or time"}
      </p>
      {!hasFilters && (
        <Button className="mt-5 gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create Rule
        </Button>
      )}
    </div>
  );
}

function RuleRow({ rule, link, index, onToggle, onDelete }) {
  const meta = RULE_META[rule.rule_type] || RULE_META.country;
  const Icon = meta.icon;
  const displayUrl = rule.redirect_url.replace(/^https?:\/\//, "");
  const slug = link?.slug || "unknown";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <div
        className={cn(
          "group flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-colors",
          rule.is_active ? "hover:bg-secondary/30" : "opacity-60 hover:opacity-80 hover:bg-secondary/20"
        )}
      >
        <div
          className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/[0.04] dark:ring-white/10",
            meta.iconBg
          )}
        >
          <Icon className={cn("h-4 w-4", meta.iconColor)} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2 sm:block">
          <div className="flex items-center gap-2 min-w-0 sm:hidden">
            <span className="text-sm font-semibold font-mono text-primary truncate">/{slug}</span>
            {link?.title && (
              <span className="text-xs text-muted-foreground truncate">{link.title}</span>
            )}
            <RuleTypeBadge meta={meta} />
            <RuleStatusBadge active={rule.is_active} />
          </div>

          <RuleFlowPipeline
            slug={slug}
            linkTitle={link?.title}
            conditionValue={rule.condition_value}
            displayUrl={displayUrl}
            redirectUrl={rule.redirect_url}
            Icon={Icon}
            meta={meta}
          />
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <RuleTypeBadge meta={meta} />
          {rule.priority > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ring-1 ring-border/60">
              <Zap className="h-2.5 w-2.5" />
              P{rule.priority}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggle}
              aria-label={rule.is_active ? "Disable rule" : "Enable rule"}
            />
            <RuleStatusBadge active={rule.is_active} />
          </div>
          <RuleActionsMenu rule={rule} onToggle={onToggle} onDelete={onDelete} />
        </div>
      </div>
    </motion.div>
  );
}

function RuleTypeBadge({ meta }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
        meta.badge
      )}
    >
      {meta.label}
    </span>
  );
}

function RuleStatusBadge({ active, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ring-1 shrink-0",
        active
          ? "bg-success/10 text-success ring-success/20"
          : "bg-muted text-muted-foreground ring-border",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-success" : "bg-muted-foreground")} />
      {active ? "Active" : "Off"}
    </span>
  );
}

function RuleFlowPipeline({ slug, linkTitle, conditionValue, displayUrl, redirectUrl, Icon, meta }) {
  return (
    <>
      <div className="hidden sm:inline-flex items-center h-9 w-fit max-w-full rounded-lg border border-border/60 bg-secondary/25 overflow-hidden min-w-0">
        <FlowSegment label="Link" icon={Link2} iconClassName="text-primary">
          <span className="font-mono text-sm font-medium text-primary truncate">/{slug}</span>
          {linkTitle && (
            <span className="text-xs text-muted-foreground truncate hidden md:inline">
              · {linkTitle}
            </span>
          )}
        </FlowSegment>
        <FlowDivider />
        <FlowSegment label="If" icon={Icon} iconClassName={meta.iconColor}>
          <span className="text-sm font-semibold truncate">{conditionValue}</span>
        </FlowSegment>
        <FlowDivider />
        <FlowSegment label="Then" icon={ExternalLink} iconClassName="text-muted-foreground" isLast>
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary truncate transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {displayUrl}
          </a>
        </FlowSegment>
      </div>

      <div className="sm:hidden flex items-center gap-1.5 text-sm min-w-0 h-8">
        <span className="text-muted-foreground shrink-0">If</span>
        <span className="font-semibold truncate">{conditionValue}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        <a
          href={redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary truncate transition-colors"
        >
          {displayUrl}
        </a>
      </div>
    </>
  );
}

function FlowSegment({ label, icon: SegmentIcon, iconClassName, children, isLast }) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-1.5 px-2.5 min-w-0",
        !isLast && "border-r border-border/50"
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0 leading-none">
        {label}
      </span>
      <SegmentIcon className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} />
      <div className="flex items-center gap-1 min-w-0 truncate">{children}</div>
    </div>
  );
}

function FlowDivider() {
  return (
    <div className="flex h-9 items-center px-0.5 text-muted-foreground/30 shrink-0">
      <ChevronRight className="h-3.5 w-3.5" />
    </div>
  );
}

function RuleActionsMenu({ rule, onToggle, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Rule actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          className="sm:hidden"
          onClick={onToggle}
        >
          {rule.is_active ? "Disable rule" : "Enable rule"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete rule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RedirectRuleForm({ links, onClose, onSaved }) {
  const [form, setForm] = useState({
    link_id: links[0]?.id || "",
    rule_type: "country",
    condition_value: "",
    redirect_url: "",
    priority: 0,
  });
  const [saving, setSaving] = useState(false);

  const meta = RULE_META[form.rule_type];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.condition_value || !form.redirect_url) return;
    setSaving(true);
    await db.entities.RedirectRule.create({ ...form, is_active: true });
    setSaving(false);
    onSaved();
    onClose();
    toast({ title: "Rule created" });
  }

  return (
    <FormDialog
      onClose={onClose}
      title="New Redirect Rule"
      icon={Route}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <FormDialogBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="rule-link">Link</Label>
            <select
              id="rule-link"
              value={form.link_id}
              onChange={(e) => setForm({ ...form, link_id: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  /{l.slug} — {l.title || l.destination_url}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Rule Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(RULE_META).map(([type, m]) => {
                const TypeIcon = m.icon;
                const selected = form.rule_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, rule_type: type, condition_value: "" })}
                    className={cn(
                      "flex flex-col items-center gap-2 py-3.5 rounded-xl border text-xs font-medium transition-all duration-200",
                      selected
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selected ? m.iconBg : "bg-muted/50"
                      )}
                    >
                      <TypeIcon className={cn("h-4 w-4", selected ? m.iconColor : "text-muted-foreground")} />
                    </div>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-condition">
              Condition Value
              <span className="ml-1 font-normal text-muted-foreground">({meta.hint})</span>
            </Label>
            <Input
              id="rule-condition"
              type="text"
              value={form.condition_value}
              onChange={(e) => setForm({ ...form, condition_value: e.target.value })}
              required
              placeholder={meta.placeholder}
              className="h-10 rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-url">Redirect URL</Label>
            <Input
              id="rule-url"
              type="url"
              value={form.redirect_url}
              onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
              required
              placeholder="https://example.com/landing"
              className="h-10 rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-priority">
              Priority
              <span className="ml-1 font-normal text-muted-foreground">(higher = checked first)</span>
            </Label>
            <Input
              id="rule-priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="h-10 rounded-xl focus-visible:ring-primary/30"
            />
          </div>
        </FormDialogBody>
        <FormDialogFooter>
          <Button type="button" variant="outline" className="flex-1 h-10" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 h-10">
            {saving ? "Creating…" : "Create Rule"}
          </Button>
        </FormDialogFooter>
      </form>
    </FormDialog>
  );
}
