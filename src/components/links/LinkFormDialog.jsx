import db from "@/api/openClient";

import { useState } from "react";

import { X, RefreshCw } from "lucide-react";
import { generateSlug, getShortUrl } from "@/lib/qrcode";
import { toast } from "@/components/ui/use-toast";

export default function LinkFormDialog({ link, campaigns, domains = [], onClose, onSaved }) {
  const isEditing = !!link;
  const [form, setForm] = useState({
    title: link?.title || "",
    slug: link?.slug || generateSlug(),
    destination_url: link?.destination_url || "",
    tags: link?.tags?.join(", ") || "",
    campaign_id: link?.campaign_id || "",
    facebook_pixel_id: link?.facebook_pixel_id || "",
    expire_by_date: link?.expire_by_date?.split("T")[0] || "",
    expire_by_clicks: link?.expire_by_clicks || "",
    fallback_url: link?.fallback_url || "",
    custom_domain: link?.custom_domain || "",
  });
  const [saving, setSaving] = useState(false);

  const shortPreview = getShortUrl(form.slug, form.custom_domain);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.destination_url) return;

    const normalizedSelectedDomain = String(form.custom_domain || "").toLowerCase();
    const existing = await db.entities.ShortLink.filter({ slug: form.slug }, "-created_date", 50);
    const duplicate = existing.find((item) => {
      if (isEditing && item.id === link.id) return false;
      const existingDomain = String(item.custom_domain || "").toLowerCase();
      return existingDomain === normalizedSelectedDomain;
    });

    if (duplicate) {
      toast({
        title: "Slug already in use",
        description: "This slug is already used for the selected domain. Pick another slug or domain.",
      });
      return;
    }

    setSaving(true);
    const data = {
      title: form.title,
      slug: form.slug,
      destination_url: form.destination_url,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      campaign_id: form.campaign_id || null,
      facebook_pixel_id: form.facebook_pixel_id || null,
      expire_by_date: form.expire_by_date ? new Date(form.expire_by_date).toISOString() : null,
      expire_by_clicks: form.expire_by_clicks ? Number(form.expire_by_clicks) : null,
      fallback_url: form.fallback_url || null,
      custom_domain: form.custom_domain || null,
      status: "active",
    };

    if (isEditing) {
      await db.entities.ShortLink.update(link.id, data);
      toast({ title: "Updated", description: "Link has been updated" });
    } else {
      await db.entities.ShortLink.create(data);
      toast({ title: "Created", description: "New short link created" });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{isEditing ? "Edit Link" : "Create New Link"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title (optional)</label>
            <input
              type="text"
              placeholder="e.g. Raya Promo Landing"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination URL *</label>
            <input
              type="url"
              placeholder="https://example.com/your-page"
              value={form.destination_url}
              onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
              required
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Slug</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, slug: generateSlug() })}
                className="px-3 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-primary mt-1.5 font-mono truncate">{shortPreview}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Short Domain</label>
            <select
              value={form.custom_domain}
              onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Default ({window.location.host})</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain}>{d.domain}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="promo, social, raya"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Campaign</label>
            <select
              value={form.campaign_id}
              onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">No campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Facebook Pixel ID (optional)</label>
            <input
              type="text"
              placeholder="123456789"
              value={form.facebook_pixel_id}
              onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expire by Date</label>
              <input
                type="date"
                value={form.expire_by_date}
                onChange={(e) => setForm({ ...form, expire_by_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expire by Clicks</label>
              <input
                type="number"
                placeholder="1000"
                value={form.expire_by_clicks}
                onChange={(e) => setForm({ ...form, expire_by_clicks: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Fallback URL (after expiry)</label>
            <input
              type="url"
              placeholder="https://example.com/expired"
              value={form.fallback_url}
              onChange={(e) => setForm({ ...form, fallback_url: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Update Link" : "Create Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}