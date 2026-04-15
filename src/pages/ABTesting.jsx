import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Plus, FlaskConical, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { generateSlug } from "@/lib/qrcode";

export default function ABTesting() {
  const [links, setLinks] = useState([]);
  const [variants, setVariants] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [l, v, c] = await Promise.all([
      db.entities.ShortLink.list("-created_date", 200),
      db.entities.ABVariant.list("-created_date", 200),
      db.entities.ClickLog.list("-created_date", 1000),
    ]);
    setLinks(l.filter((link) => link.is_ab_test));
    setVariants(v);
    setClicks(c);
    setLoading(false);
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
          <h1 className="text-2xl font-bold tracking-tight">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">Split test your links</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New A/B Test
        </button>
      </div>

      {links.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="mt-4 text-lg font-medium">No A/B tests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a split test to compare link performance</p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => {
            const linkVariants = variants.filter((v) => v.link_id === link.id);
            const linkClicks = clicks.filter((c) => c.link_id === link.id);
            return (
              <ABTestCard key={link.id} link={link} variants={linkVariants} clicks={linkClicks} />
            );
          })}
        </div>
      )}

      {showForm && (
        <ABTestForm onClose={() => setShowForm(false)} onSaved={loadData} />
      )}
    </div>
  );
}

function ABTestCard({ link, variants, clicks }) {
  const totalClicks = clicks.length;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">{link.title || `/${link.slug}`}</h3>
          <p className="text-xs text-muted-foreground font-mono">/{link.slug}</p>
        </div>
        <span className="text-sm font-semibold">{totalClicks} clicks</span>
      </div>
      <div className="space-y-3">
        {variants.map((variant) => {
          const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
          const variantConversions = clicks.filter(
            (c) => c.ab_variant === variant.name && c.is_converted
          ).length;
          const convRate = variantClicks > 0 ? ((variantConversions / variantClicks) * 100).toFixed(1) : 0;
          return (
            <div key={variant.id} className="p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">{variant.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({variant.weight}% traffic)</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span>{variantClicks} clicks</span>
                  <span>{variantConversions} conv.</span>
                  <span className="font-semibold text-primary">{convRate}% CR</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">{variant.destination_url}</p>
              <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: totalClicks > 0 ? `${(variantClicks / totalClicks) * 100}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ABTestForm({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState(generateSlug());
  const [variantList, setVariantList] = useState([
    { name: "Variant A", destination_url: "", weight: 50 },
    { name: "Variant B", destination_url: "", weight: 50 },
  ]);
  const [saving, setSaving] = useState(false);

  function updateVariant(idx, field, value) {
    setVariantList((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  }

  function addVariant() {
    const letter = String.fromCharCode(65 + variantList.length);
    setVariantList([...variantList, { name: `Variant ${letter}`, destination_url: "", weight: 0 }]);
  }

  function removeVariant(idx) {
    if (variantList.length <= 2) return;
    setVariantList((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!variantList.every((v) => v.destination_url)) return;

    setSaving(true);
    const link = await db.entities.ShortLink.create({
      title,
      slug,
      destination_url: variantList[0].destination_url,
      is_ab_test: true,
      status: "active",
    });

    await db.entities.ABVariant.bulkCreate(
      variantList.map((v) => ({
        link_id: link.id,
        name: v.name,
        destination_url: v.destination_url,
        weight: Number(v.weight),
      }))
    );

    setSaving(false);
    onSaved();
    onClose();
    toast({ title: "A/B test created" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">New A/B Test</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Test Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Landing Page Test"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Variants</label>
              <button type="button" onClick={addVariant} className="text-xs text-primary hover:underline">
                + Add variant
              </button>
            </div>
            {variantList.map((v, i) => (
              <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVariant(i, "name", e.target.value)}
                    className="text-sm font-medium bg-transparent focus:outline-none"
                  />
                  {variantList.length > 2 && (
                    <button type="button" onClick={() => removeVariant(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="Destination URL"
                  value={v.destination_url}
                  onChange={(e) => updateVariant(i, "destination_url", e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Weight:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={v.weight}
                    onChange={(e) => updateVariant(i, "weight", e.target.value)}
                    className="w-16 px-2 py-1 rounded border border-border bg-background text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}