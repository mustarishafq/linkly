import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import { Plus, Megaphone, MoreHorizontal, Trash2, Edit, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">{campaigns.length} campaigns</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="mt-4 text-lg font-medium">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mt-1">Group your links under campaigns</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const campaignLinks = links.filter((l) => l.campaign_id === campaign.id);
            const totalClicks = campaignLinks.reduce((sum, l) => sum + (l.total_clicks || 0), 0);
            const totalConversions = campaignLinks.reduce((sum, l) => sum + (l.conversions || 0), 0);
            return (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    {campaign.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      campaign.status === "active"
                        ? "bg-emerald-50 text-emerald-600"
                        : campaign.status === "paused"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-lg font-bold">{campaignLinks.length}</p>
                    <p className="text-[10px] text-muted-foreground">Links</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{totalClicks}</p>
                    <p className="text-[10px] text-muted-foreground">Clicks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{totalConversions}</p>
                    <p className="text-[10px] text-muted-foreground">Conversions</p>
                  </div>
                </div>
              </Link>
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