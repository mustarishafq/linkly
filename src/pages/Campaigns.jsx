import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import {
  Plus,
  Megaphone,
  MoreHorizontal,
  Trash2,
  Edit,
  X,
  MousePointerClick,
  Link2,
  TrendingUp,
  ChevronRight,
  Calendar,
  BarChart3,
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

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalClicks = links.reduce((sum, l) => sum + (l.total_clicks || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organize and track groups of links</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{campaigns.length}</p>
            <p className="text-[11px] text-muted-foreground">Total Campaigns</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{activeCampaigns}</p>
            <p className="text-[11px] text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <MousePointerClick className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Total Clicks</p>
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-semibold">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mt-1">Group your links under campaigns to track performance</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const campaignLinks = links.filter((l) => l.campaign_id === campaign.id);
            const totalClicks = campaignLinks.reduce((sum, l) => sum + (l.total_clicks || 0), 0);
            const totalConversions = campaignLinks.reduce((sum, l) => sum + (l.conversions || 0), 0);
            const ctr = campaignLinks.length > 0 && totalClicks > 0
              ? Math.round((totalConversions / totalClicks) * 100)
              : 0;

            return (
              <div key={campaign.id} className="group bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col">
                {/* Card Header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Megaphone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{campaign.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CampaignStatusBadge status={campaign.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setEditing(campaign); setShowForm(true); }}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.preventDefault(); deleteCampaign(campaign.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Dates */}
                  {(campaign.start_date || campaign.end_date) && (
                    <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "—"}
                        {" → "}
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "Ongoing"}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-lg font-bold">{campaignLinks.length}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <Link2 className="h-2.5 w-2.5" /> Links
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{totalClicks.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <MousePointerClick className="h-2.5 w-2.5" /> Clicks
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{totalConversions}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <BarChart3 className="h-2.5 w-2.5" /> Conv.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between px-5 py-3 border-t border-border rounded-b-2xl text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted/30 transition-colors"
                >
                  <span>View details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <CampaignFormDialog
          campaign={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function CampaignStatusBadge({ status }) {
  const map = {
    active: { label: "Active", dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700" },
    paused: { label: "Paused", dot: "bg-amber-500", cls: "bg-amber-50 text-amber-600" },
    completed: { label: "Done", dot: "bg-gray-400", cls: "bg-gray-100 text-gray-600" },
  };
  const s = map[status] || { label: status, dot: "bg-gray-400", cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{isEditing ? "Edit Campaign" : "New Campaign"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}