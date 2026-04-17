import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Plus, FlaskConical, Trash2, X, MousePointerClick, TrendingUp, Trophy, ExternalLink, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { generateSlug, getShortUrl } from "@/lib/qrcode";

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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalTests = links.length;
  const totalClicks = clicks.length;
  const activeTests = links.filter((l) => l.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A/B Testing</h1>
          <p className="text-muted-foreground mt-1 text-sm">Split test your links to find what converts best</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> New A/B Test
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{totalTests}</p>
            <p className="text-[11px] text-muted-foreground">Total Tests</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{activeTests}</p>
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

      {links.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-semibold">No A/B tests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a split test to compare link performance</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create A/B Test
          </button>
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

const VARIANT_COLORS = [
  { bar: "bg-primary", badge: "bg-primary/10 text-primary", dot: "bg-primary" },
  { bar: "bg-violet-500", badge: "bg-violet-100 text-violet-600", dot: "bg-violet-500" },
  { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-600", dot: "bg-amber-500" },
  { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500" },
];

function ABTestCard({ link, variants, clicks }) {
  const totalClicks = clicks.length;

  // Find best performer by conversion rate
  const bestVariantId = variants.reduce((best, v) => {
    const vc = clicks.filter((c) => c.ab_variant === v.name).length;
    const vConv = clicks.filter((c) => c.ab_variant === v.name && c.is_converted).length;
    const cr = vc > 0 ? vConv / vc : 0;
    const bestVc = clicks.filter((c) => c.ab_variant === best?.name).length;
    const bestConv = clicks.filter((c) => c.ab_variant === best?.name && c.is_converted).length;
    const bestCr = bestVc > 0 ? bestConv / bestVc : 0;
    return cr > bestCr ? v : best;
  }, variants[0]);

  return (
    <div className="bg-card rounded-2xl border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200">
      {/* Card Header */}
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{link.title || `/${link.slug}`}</h3>
              <span className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                link.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", link.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                {link.status}
              </span>
            </div>
            <a
              href={getShortUrl(link.slug, link.custom_domain)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary font-mono hover:underline"
            >
              {getShortUrl(link.slug, link.custom_domain)}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">total clicks</p>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="px-5 pb-5 space-y-3">
        {variants.map((variant, idx) => {
          const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
          const variantConversions = clicks.filter(
            (c) => c.ab_variant === variant.name && c.is_converted
          ).length;
          const convRate = variantClicks > 0 ? ((variantConversions / variantClicks) * 100).toFixed(1) : "0.0";
          const sharePercent = totalClicks > 0 ? ((variantClicks / totalClicks) * 100).toFixed(0) : 0;
          const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
          const isWinner = variant.id === bestVariantId?.id && variantClicks > 0;

          return (
            <div key={variant.id} className={cn(
              "rounded-xl border p-4 transition-colors",
              isWinner ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-muted/30"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", color.badge)}>
                    {variant.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{variant.weight}% traffic</span>
                  {isWinner && variantClicks > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                      <Trophy className="h-2.5 w-2.5" /> Leader
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center hidden sm:block">
                    <p className="font-semibold">{variantClicks}</p>
                    <p className="text-[10px] text-muted-foreground">clicks</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-semibold">{variantConversions}</p>
                    <p className="text-[10px] text-muted-foreground">conv.</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("font-bold", parseFloat(convRate) > 0 ? "text-primary" : "text-muted-foreground")}>{convRate}%</p>
                    <p className="text-[10px] text-muted-foreground">CVR</p>
                  </div>
                </div>
              </div>
              <a
                href={variant.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors truncate mb-3 group/url"
              >
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/url:opacity-100 transition-opacity" />
                {variant.destination_url}
              </a>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{sharePercent}% of clicks</span>
                  <span>{variantClicks} / {totalClicks}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", color.bar)}
                    style={{ width: totalClicks > 0 ? `${(variantClicks / totalClicks) * 100}%` : "0%" }}
                  />
                </div>
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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="font-semibold">New A/B Test</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
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
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Variants</label>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs text-primary hover:underline font-medium"
              >
                + Add variant
              </button>
            </div>
            {variantList.map((v, i) => {
              const color = VARIANT_COLORS[i % VARIANT_COLORS.length];
              return (
                <div key={i} className="rounded-xl border border-border overflow-hidden">
                  <div className={cn("flex items-center justify-between px-3 py-2 text-xs font-bold", color.badge)}>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVariant(i, "name", e.target.value)}
                      className="bg-transparent focus:outline-none font-bold w-full"
                    />
                    {variantList.length > 2 && (
                      <button type="button" onClick={() => removeVariant(i)} className="shrink-0 ml-2">
                        <Trash2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100 hover:text-destructive transition-colors" />
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2 bg-background">
                    <input
                      type="url"
                      placeholder="Destination URL"
                      value={v.destination_url}
                      onChange={(e) => updateVariant(i, "destination_url", e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Traffic weight:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={v.weight}
                        onChange={(e) => updateVariant(i, "weight", e.target.value)}
                        className="w-16 px-2 py-1 rounded-lg border border-border bg-card text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}