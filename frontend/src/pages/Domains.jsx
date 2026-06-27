// @ts-nocheck
import db from "@/api/openClient";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ShieldCheck,
  Link2,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Server,
  FileText,
  RefreshCw,
  Power,
  PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import { APP_NAME } from "@/lib/settingsConfig";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "verified", label: "Verified" },
  { id: "pending", label: "Pending" },
];

const SETUP_STEPS = [
  {
    step: 1,
    title: "Register domain",
    description: "Add your hostname below (e.g. go.yourbrand.com).",
    icon: Globe,
  },
  {
    step: 2,
    title: "Point DNS",
    description: `CNAME or reverse-proxy this host to your ${APP_NAME} app.`,
    icon: Server,
  },
  {
    step: 3,
    title: "Add TXT record",
    description: "Publish the verification record shown on each domain card.",
    icon: FileText,
  },
  {
    step: 4,
    title: "Verify & use",
    description: "Run Verify DNS, then pick the domain when creating links.",
    icon: ShieldCheck,
  },
];

function generateVerificationToken() {
  return Math.random().toString(36).slice(2, 14);
}

function normalizeDomainInput(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return "";

  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const normalized = withoutProtocol.replace(/\/$/, "").split("/")[0];
  return normalized;
}

function isValidHostname(value) {
  if (!value || value.length > 253) return false;
  if (value.includes(" ")) return false;
  return value
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function DomainsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

export default function Domains() {
  const [domains, setDomains] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();

  useEffect(() => {
    loadDomains();
  }, [user?.id, user?.role]);

  async function loadDomains() {
    setLoading(true);
    const [all, allLinks] = await Promise.all([
      db.entities.CustomDomain.list("-created_date", 300),
      db.entities.ShortLink.list("-created_date", 500),
    ]);
    const visible = all.filter(
      (item) => user?.role === "admin" || item.owner_user_id === user?.id
    );
    setDomains(visible);
    setLinks(allLinks);
    setLoading(false);
  }

  async function addDomain(e) {
    e.preventDefault();
    const normalized = normalizeDomainInput(domainInput);
    if (!normalized || !isValidHostname(normalized)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid hostname, e.g. go.yourbrand.com",
      });
      return;
    }

    if (domains.some((d) => String(d.domain || "").toLowerCase() === normalized)) {
      toast({ title: "Already exists", description: "This domain is already registered." });
      return;
    }

    setSaving(true);
    const token = generateVerificationToken();
    await db.entities.CustomDomain.create({
      domain: normalized,
      owner_user_id: user?.id || null,
      is_active: true,
      status: "active",
      verification_token: token,
      verification_name: `_linkly.${normalized}`,
      verification_value: `linkly-verification=${token}`,
      verification_status: "pending",
      verification_last_checked_date: null,
      verification_verified_date: null,
      verification_error: null,
    });
    setDomainInput("");
    setSaving(false);
    await loadDomains();
    toast({
      title: "Domain added",
      description: "Add the TXT record below, then verify DNS.",
    });
  }

  async function verifyDomain(domain) {
    setVerifyingId(domain.id);
    try {
      const result = await db.domains.verify(domain.id);
      toast({
        title: result?.verified ? "Domain verified" : "Verification pending",
        description: result?.verified
          ? "TXT record found. Domain is verified."
          : "TXT record not found yet. DNS propagation may still be in progress.",
      });
      await loadDomains();
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error?.message || "Unable to verify DNS TXT record.",
      });
    } finally {
      setVerifyingId("");
    }
  }

  async function copyText(value, label) {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied.` });
  }

  async function toggleActive(domain) {
    await db.entities.CustomDomain.update(domain.id, {
      is_active: !(domain.is_active !== false),
      status: domain.is_active !== false ? "inactive" : "active",
    });
    await loadDomains();
    toast({
      title: domain.is_active !== false ? "Domain disabled" : "Domain enabled",
    });
  }

  async function removeDomain(id) {
    await db.entities.CustomDomain.delete(id);
    await loadDomains();
    toast({ title: "Domain removed" });
  }

  const linkCountByDomain = useMemo(() => {
    const map = {};
    for (const link of links) {
      const host = String(link.custom_domain || "").toLowerCase();
      if (!host) continue;
      map[host] = (map[host] || 0) + 1;
    }
    return map;
  }, [links]);

  const stats = useMemo(() => {
    const active = domains.filter((d) => d.is_active !== false).length;
    const verified = domains.filter((d) => d.verification_status === "verified").length;
    const linksOnCustom = links.filter((l) => l.custom_domain).length;
    return { active, verified, linksOnCustom };
  }, [domains, links]);

  const filtered = useMemo(() => {
    return domains.filter((domain) => {
      const matchesSearch =
        !search || domain.domain?.toLowerCase().includes(search.toLowerCase());
      const isActive = domain.is_active !== false;
      const isVerified = domain.verification_status === "verified";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "verified" && isVerified) ||
        (statusFilter === "pending" && !isVerified);
      return matchesSearch && matchesStatus;
    });
  }, [domains, search, statusFilter]);

  if (loading) {
    return <DomainsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe}
        title="Custom Domains"
        description="Register branded hosts and choose which one to use per short link."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Globe}
          label="Total Domains"
          value={domains.length}
          subtitle={`${stats.active} active`}
          accent="info"
          index={0}
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified"
          value={stats.verified}
          subtitle={
            domains.length > 0
              ? `${Math.round((stats.verified / domains.length) * 100)}% of total`
              : "None verified yet"
          }
          accent="success"
          index={1}
        />
        <StatCard
          icon={Link2}
          label="Branded Links"
          value={stats.linksOnCustom}
          subtitle="Using custom domains"
          accent="primary"
          index={2}
        />
        <StatCard
          icon={AlertCircle}
          label="Pending DNS"
          value={domains.length - stats.verified}
          subtitle="Awaiting verification"
          accent="warning"
          index={3}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <DashboardWidget icon={FileText} title="Setup Guide">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SETUP_STEPS.map(({ step, title, description, icon: Icon }) => (
              <div
                key={step}
                className="relative rounded-xl border border-border bg-secondary/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Step {step}
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Short links on custom domains use the{" "}
            <span className="font-mono text-foreground/80">/r/slug</span> path — e.g.{" "}
            <span className="font-mono text-foreground/80">https://go.yourbrand.com/r/promo</span>
          </p>
        </DashboardWidget>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <DashboardWidget icon={Plus} title="Add Domain">
          <form onSubmit={addDomain} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="domain-input" className="text-xs text-muted-foreground">
                  Hostname
                </Label>
                <Input
                  id="domain-input"
                  type="text"
                  placeholder="go.yourbrand.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="h-10 rounded-xl bg-secondary/40 border-border/60 focus-visible:ring-primary/30 font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto h-10 gap-2 shadow-md shadow-primary/20 hover:shadow-primary/30"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {saving ? "Adding..." : "Add Domain"}
                </Button>
              </div>
            </div>
          </form>
        </DashboardWidget>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <DashboardWidget
          icon={Globe}
          title="Registered Domains"
          action={
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {filtered.length} of {domains.length}
            </span>
          }
          noPadding
        >
          {domains.length > 0 && (
            <div className="px-5 pb-4 space-y-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search domains..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-secondary/40 border-border/60 focus-visible:ring-primary/30"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {STATUS_FILTERS.map((filter) => (
                    <StatusPill
                      key={filter.id}
                      active={statusFilter === filter.id}
                      onClick={() => setStatusFilter(filter.id)}
                    >
                      {filter.label}
                    </StatusPill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {domains.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
                <Search className="h-7 w-7 text-primary/60" />
              </div>
              <p className="text-base font-semibold">No domains found</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Try adjusting your search or filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 sm:p-5">
              {filtered.map((domain, i) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  linkCount={linkCountByDomain[String(domain.domain || "").toLowerCase()] || 0}
                  verifying={verifyingId === domain.id}
                  index={i}
                  onVerify={() => verifyDomain(domain)}
                  onToggleActive={() => toggleActive(domain)}
                  onDelete={() => removeDomain(domain.id)}
                  onCopy={copyText}
                />
              ))}
            </div>
          )}
        </DashboardWidget>
      </motion.div>
    </div>
  );
}

function StatusPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
          : "bg-secondary/60 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
        <Globe className="h-7 w-7 text-primary/60" />
      </div>
      <p className="text-base font-semibold">No custom domains yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Add a hostname above to start using branded short links
      </p>
    </div>
  );
}

function DomainStatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-success/10 text-success ring-1 ring-success/20">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-warning/10 text-warning ring-1 ring-warning/20">
      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
      Inactive
    </span>
  );
}

function DnsStatusBadge({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-success/10 text-success ring-1 ring-success/20">
      <CheckCircle2 className="h-3 w-3" />
      DNS Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-warning/10 text-warning ring-1 ring-warning/20">
      <AlertCircle className="h-3 w-3" />
      DNS Pending
    </span>
  );
}

function CopyField({ label, value, onCopy }) {
  return (
    <div className="rounded-lg border border-border bg-background/80 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono break-all text-foreground/90">{value}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2"
          onClick={() => onCopy(value, label)}
        >
          <Copy className="h-3 w-3" />
          <span className="sr-only">Copy {label}</span>
        </Button>
      </div>
    </div>
  );
}

function DomainActionsMenu({ domain, verifying, onVerify, onToggleActive, onDelete }) {
  const isActive = domain.is_active !== false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Domain actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onVerify} disabled={verifying}>
          {verifying ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
          )}
          Verify DNS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleActive}>
          {isActive ? (
            <PowerOff className="h-3.5 w-3.5 mr-2" />
          ) : (
            <Power className="h-3.5 w-3.5 mr-2" />
          )}
          {isActive ? "Disable" : "Enable"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DomainCard({
  domain,
  linkCount,
  verifying,
  index,
  onVerify,
  onToggleActive,
  onDelete,
  onCopy,
}) {
  const isActive = domain.is_active !== false;
  const isVerified = domain.verification_status === "verified";
  const txtName = domain.verification_name || `_linkly.${domain.domain}`;
  const txtValue =
    domain.verification_value || `linkly-verification=${domain.verification_token || ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <div className="group h-full bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 flex flex-col overflow-hidden">
        <div className="p-4 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 group-hover:scale-105 transition-transform duration-300",
                  isVerified
                    ? "bg-success/10 ring-success/20"
                    : "bg-primary/10 ring-primary/15"
                )}
              >
                <Globe
                  className={cn("h-4 w-4", isVerified ? "text-success" : "text-primary")}
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm font-mono truncate">{domain.domain}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  https://{domain.domain}/r/your-slug
                </p>
              </div>
            </div>
            <DomainActionsMenu
              domain={domain}
              verifying={verifying}
              onVerify={onVerify}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <DomainStatusBadge active={isActive} />
            <DnsStatusBadge verified={isVerified} />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
            <div className="rounded-lg bg-secondary/40 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Links
              </p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">{linkCount}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </p>
              <p className="text-sm font-semibold mt-0.5">
                {isActive && isVerified ? "Ready" : isActive ? "Setup" : "Off"}
              </p>
            </div>
          </div>

          <Collapsible defaultOpen={!isVerified} className="mt-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group/trigger">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                DNS verification record
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/trigger:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <CopyField label="TXT name" value={txtName} onCopy={onCopy} />
              <CopyField label="TXT value" value={txtValue} onCopy={onCopy} />
              {domain.verification_error && !isVerified && (
                <p className="text-[11px] text-warning px-1">
                  Last check: {domain.verification_error}
                </p>
              )}
              {!isVerified && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={onVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Verify DNS
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </motion.div>
  );
}
