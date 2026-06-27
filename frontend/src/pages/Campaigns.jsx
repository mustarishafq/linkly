import db from "@/api/openClient";

import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Megaphone,
  MoreHorizontal,
  Trash2,
  Edit,
  MousePointerClick,
  Link2,
  TrendingUp,
  ChevronRight,
  Calendar,
  Search,
  Filter,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/layout/PageHeader";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "completed", label: "Completed" },
];

function CampaignsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [c, l] = await Promise.all([
      db.entities.Campaign.list("-created_date", 100),
      db.entities.ShortLink.list("-created_date", 200),
    ]);
    setCampaigns(c);
    setLinks(l);
    setLoading(false);
  }

  async function deleteCampaign(id) {
    await db.entities.Campaign.delete(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Campaign deleted" });
  }

  function promptDeleteCampaign(campaign, linkCount) {
    const linksNote =
      linkCount > 0
        ? ` ${linkCount} link${linkCount === 1 ? "" : "s"} will be unassigned from this campaign.`
        : "";
    requestConfirm({
      title: "Delete campaign?",
      description: `"${campaign.name}" will be deleted permanently.${linksNote}`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => deleteCampaign(campaign.id),
    });
  }

  function openCreateForm() {
    setEditing(null);
    setShowForm(true);
  }

  const campaignStats = useMemo(() => {
    return campaigns.map((campaign) => {
      const campaignLinks = links.filter((l) => l.campaign_id === campaign.id);
      const totalClicks = campaignLinks.reduce((sum, l) => sum + (l.total_clicks || 0), 0);
      const totalConversions = campaignLinks.reduce((sum, l) => sum + (l.conversions || 0), 0);
      const convRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0;
      return { campaign, campaignLinks, totalClicks, totalConversions, convRate };
    });
  }, [campaigns, links]);

  const filtered = useMemo(() => {
    return campaignStats.filter(({ campaign }) => {
      const matchesSearch =
        !search ||
        campaign.name?.toLowerCase().includes(search.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaignStats, search, statusFilter]);

  if (loading) {
    return <CampaignsSkeleton />;
  }

  const totalClicks = links.reduce((sum, l) => sum + (l.total_clicks || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const linkedCount = links.filter((l) => l.campaign_id).length;
  const maxClicks = Math.max(...campaignStats.map((s) => s.totalClicks), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Campaigns"
        description="Organize and track groups of links"
        action={
          <Button
            className="gap-2 h-10 w-full sm:w-auto sm:h-9 shadow-md shadow-primary/20 hover:shadow-primary/30"
            onClick={openCreateForm}
          >
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={Megaphone}
          label="Total Campaigns"
          value={campaigns.length}
          subtitle={`${activeCampaigns} active`}
          accent="info"
          index={0}
        />
        <StatCard
          icon={TrendingUp}
          label="Active"
          value={activeCampaigns}
          subtitle={campaigns.length > 0 ? `${Math.round((activeCampaigns / campaigns.length) * 100)}% of total` : "No campaigns yet"}
          accent="success"
          index={1}
        />
        <StatCard
          icon={MousePointerClick}
          label="Total Clicks"
          value={totalClicks.toLocaleString()}
          subtitle={`${linkedCount} links assigned`}
          accent="primary"
          index={2}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <DashboardWidget
          icon={Megaphone}
          title="All Campaigns"
          action={
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {filtered.length} of {campaigns.length}
            </span>
          }
          noPadding
        >
          <div className="px-5 pb-4 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search campaigns..."
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

          {filtered.length === 0 ? (
            <EmptyState
              hasSearch={Boolean(search || statusFilter !== "all")}
              onCreate={openCreateForm}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-5">
              {filtered.map(({ campaign, campaignLinks, totalClicks: clicks, totalConversions, convRate }, i) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  linkCount={campaignLinks.length}
                  totalClicks={clicks}
                  totalConversions={totalConversions}
                  convRate={convRate}
                  maxClicks={maxClicks}
                  index={i}
                  onEdit={() => { setEditing(campaign); setShowForm(true); }}
                  onDelete={() => promptDeleteCampaign(campaign, campaignLinks.length)}
                />
              ))}
            </div>
          )}
        </DashboardWidget>
      </motion.div>

      {showForm && (
        <CampaignFormDialog
          campaign={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={loadData}
        />
      )}

      {confirmDialog}
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

function EmptyState({ hasSearch, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/15">
        <Megaphone className="h-7 w-7 text-primary/60" />
      </div>
      <p className="text-base font-semibold">
        {hasSearch ? "No campaigns found" : "No campaigns yet"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        {hasSearch
          ? "Try adjusting your search or filter"
          : "Group your links under campaigns to track performance"}
      </p>
      {!hasSearch && (
        <Button className="mt-5 gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create Campaign
        </Button>
      )}
    </div>
  );
}

function CampaignStatusBadge({ status }) {
  const map = {
    active: {
      label: "Active",
      dot: "bg-success",
      cls: "bg-success/10 text-success ring-1 ring-success/20",
    },
    paused: {
      label: "Paused",
      dot: "bg-warning",
      cls: "bg-warning/10 text-warning ring-1 ring-warning/20",
    },
    completed: {
      label: "Done",
      dot: "bg-muted-foreground/50",
      cls: "bg-muted text-muted-foreground ring-1 ring-border",
    },
  };
  const s = map[status] || {
    label: status,
    dot: "bg-muted-foreground/50",
    cls: "bg-muted text-muted-foreground ring-1 ring-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
        s.cls
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function CampaignActionsMenu({ onEdit, onDelete, campaignId, triggerClassName }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
            triggerClassName
          )}
          aria-label="Campaign actions"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/campaigns/${campaignId}`}>
            <ChevronRight className="h-3.5 w-3.5 mr-2" /> View Details
          </Link>
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

function CampaignCard({
  campaign,
  linkCount,
  totalClicks,
  totalConversions,
  convRate,
  maxClicks,
  index,
  onEdit,
  onDelete,
}) {
  const pct = Math.round((totalClicks / maxClicks) * 100);

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
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/15 group-hover:scale-105 transition-transform duration-300">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="font-semibold text-sm group-hover:text-primary transition-colors truncate block"
                >
                  {campaign.name}
                </Link>
                {campaign.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{campaign.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <CampaignStatusBadge status={campaign.status} />
              <CampaignActionsMenu
                campaignId={campaign.id}
                onEdit={onEdit}
                onDelete={onDelete}
                triggerClassName="hidden sm:block opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              />
            </div>
          </div>

          <div className="sm:hidden flex items-center justify-end gap-0.5 mt-2 -mr-1">
            <CampaignActionsMenu
              campaignId={campaign.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>

          {(campaign.start_date || campaign.end_date) && (
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {campaign.start_date
                  ? new Date(campaign.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
                {" → "}
                {campaign.end_date
                  ? new Date(campaign.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : "Ongoing"}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums shrink-0 text-muted-foreground">
              {totalClicks.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
            <StatMini icon={Link2} label="Links" value={linkCount} />
            <StatMini icon={MousePointerClick} label="Clicks" value={totalClicks.toLocaleString()} />
            <StatMini icon={Target} label="Conv." value={convRate > 0 ? `${convRate}%` : totalConversions} />
          </div>
        </div>

        <Link
          to={`/campaigns/${campaign.id}`}
          className="flex items-center justify-between px-4 py-3 border-t border-border text-xs font-medium text-muted-foreground hover:text-primary hover:bg-secondary/30 transition-colors"
        >
          <span>View details</span>
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}

function StatMini({ icon: Icon, label, value }) {
  return (
    <div className="text-center min-w-0">
      <p className="text-base font-bold tabular-nums truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
        <Icon className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{label}</span>
      </p>
    </div>
  );
}

function CampaignFormDialog({ campaign, onClose, onSaved }) {
  const isEditing = !!campaign;
  const [form, setForm] = useState({
    name: campaign?.name || "",
    description: campaign?.description || "",
    status: campaign?.status || "active",
    start_date: campaign?.start_date?.split("T")[0] || "",
    end_date: campaign?.end_date?.split("T")[0] || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const data = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
    };
    if (isEditing) {
      await db.entities.Campaign.update(campaign.id, data);
    } else {
      await db.entities.Campaign.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
    toast({ title: isEditing ? "Campaign updated" : "Campaign created" });
  }

  return (
    <FormDialog
      onClose={onClose}
      title={isEditing ? "Edit Campaign" : "New Campaign"}
      icon={Megaphone}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <FormDialogBody className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Raya Promo 2026"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Brief description of this campaign..."
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
        </FormDialogBody>
        <FormDialogFooter>
          <Button type="button" variant="outline" className="flex-1 h-10" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 h-10">
            {saving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </FormDialogFooter>
      </form>
    </FormDialog>
  );
}
