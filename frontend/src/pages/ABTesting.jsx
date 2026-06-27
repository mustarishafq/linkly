import db from "@/api/openClient";

import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  FlaskConical,
  Trash2,
  MousePointerClick,
  TrendingUp,
  Trophy,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Target,
  Percent,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { generateSlug, getShortUrl } from "@/lib/qrcode";
import PageHeader from "@/components/layout/PageHeader";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
];

const VARIANT_COLORS = [
  { bar: "bg-primary", badge: "bg-primary/10 text-primary ring-1 ring-primary/20", dot: "bg-primary" },
  { bar: "bg-info", badge: "bg-info/10 text-info ring-1 ring-info/20", dot: "bg-info" },
  { bar: "bg-warning", badge: "bg-warning/10 text-warning ring-1 ring-warning/20", dot: "bg-warning" },
  { bar: "bg-success", badge: "bg-success/10 text-success ring-1 ring-success/20", dot: "bg-success" },
];

function ABTestingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  );
}

export default function ABTesting() {
  const [links, setLinks] = useState([]);
  const [variants, setVariants] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const testStats = useMemo(() => {
    return links.map((link) => {
      const linkVariants = variants.filter((v) => v.link_id === link.id);
      const linkClicks = clicks.filter((c) => c.link_id === link.id);
      const conversions = linkClicks.filter((c) => c.is_converted).length;
      const convRate =
        linkClicks.length > 0 ? ((conversions / linkClicks.length) * 100).toFixed(1) : "0.0";
      return { link, linkVariants, linkClicks, conversions, convRate };
    });
  }, [links, variants, clicks]);

  const filtered = useMemo(() => {
    return testStats.filter(({ link }) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        link.title?.toLowerCase().includes(q) ||
        link.slug?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || link.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [testStats, search, statusFilter]);

  if (loading) {
    return <ABTestingSkeleton />;
  }

  const totalTests = links.length;
  const totalClicks = clicks.filter((c) => links.some((l) => l.id === c.link_id)).length;
  const activeTests = links.filter((l) => l.status === "active").length;
  const avgVariants =
    links.length > 0
      ? (variants.filter((v) => links.some((l) => l.id === v.link_id)).length / links.length).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FlaskConical}
        title="A/B Testing"
        description="Split test your links to find what converts best"
        action={
          <Button
            className="gap-2 h-10 w-full sm:w-auto sm:h-9 shadow-md shadow-primary/20 hover:shadow-primary/30"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" /> New A/B Test
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={FlaskConical}
          label="Total Tests"
          value={totalTests}
          subtitle={`${avgVariants} avg variants`}
          accent="info"
          index={0}
        />
        <StatCard
          icon={TrendingUp}
          label="Active"
          value={activeTests}
          subtitle={
            totalTests > 0
              ? `${Math.round((activeTests / totalTests) * 100)}% of total`
              : "No tests yet"
          }
          accent="success"
          index={1}
        />
        <StatCard
          icon={MousePointerClick}
          label="Total Clicks"
          value={totalClicks.toLocaleString()}
          subtitle="Across all tests"
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
          icon={FlaskConical}
          title="All Tests"
          action={
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {filtered.length} of {links.length}
            </span>
          }
          noPadding
        >
          <div className="px-5 pb-4 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search tests..."
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
              onCreate={() => setShowForm(true)}
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 sm:p-5">
              {filtered.map(({ link, linkVariants, linkClicks, conversions, convRate }, i) => (
                <ABTestCard
                  key={link.id}
                  link={link}
                  variants={linkVariants}
                  clicks={linkClicks}
                  conversions={conversions}
                  convRate={convRate}
                  index={i}
                />
              ))}
            </div>
          )}
        </DashboardWidget>
      </motion.div>

      {showForm && (
        <ABTestForm onClose={() => setShowForm(false)} onSaved={loadData} />
      )}
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
        <FlaskConical className="h-7 w-7 text-primary/60" />
      </div>
      <p className="text-base font-semibold">
        {hasSearch ? "No tests found" : "No A/B tests yet"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        {hasSearch
          ? "Try adjusting your search or filter"
          : "Create a split test to compare link performance and find your best converter"}
      </p>
      {!hasSearch && (
        <Button className="mt-5 gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create A/B Test
        </Button>
      )}
    </div>
  );
}

function TestStatusBadge({ status }) {
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
    expired: {
      label: "Expired",
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

function ABTestCard({ link, variants, clicks, conversions, convRate, index }) {
  const totalClicks = clicks.length;
  const shortUrl = getShortUrl(link.slug, link.custom_domain);

  const bestVariantId = variants.reduce((best, v) => {
    const vc = clicks.filter((c) => c.ab_variant === v.name).length;
    const vConv = clicks.filter((c) => c.ab_variant === v.name && c.is_converted).length;
    const cr = vc > 0 ? vConv / vc : 0;
    const bestVc = clicks.filter((c) => c.ab_variant === best?.name).length;
    const bestConv = clicks.filter((c) => c.ab_variant === best?.name && c.is_converted).length;
    const bestCr = bestVc > 0 ? bestConv / bestVc : 0;
    return cr > bestCr ? v : best;
  }, variants[0]);

  function copyUrl() {
    navigator.clipboard.writeText(shortUrl);
    toast({ title: "Link copied" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <div className="group h-full bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/15 group-hover:scale-105 transition-transform duration-300">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/links/${link.id}`}
                    className="font-semibold text-sm group-hover:text-primary transition-colors truncate"
                  >
                    {link.title || `/${link.slug}`}
                  </Link>
                  <TestStatusBadge status={link.status} />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary font-mono hover:underline truncate"
                  >
                    {shortUrl}
                  </a>
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                    aria-label="Copy short link"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {totalClicks > 0 && variants.length > 0 && (
            <div className="mt-4">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted ring-1 ring-border/60">
                {variants.map((variant, idx) => {
                  const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
                  const pct = (variantClicks / totalClicks) * 100;
                  const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={variant.id}
                      className={cn("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full", color.bar)}
                      style={{ width: `${pct}%` }}
                      title={`${variant.name}: ${pct.toFixed(0)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {variants.map((variant, idx) => {
                  const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
                  return (
                    <span key={variant.id} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", color.dot)} />
                      {variant.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {variants.map((variant, idx) => {
              const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
              const variantConversions = clicks.filter(
                (c) => c.ab_variant === variant.name && c.is_converted
              ).length;
              const variantConvRate =
                variantClicks > 0 ? ((variantConversions / variantClicks) * 100).toFixed(1) : "0.0";
              const sharePercent =
                totalClicks > 0 ? ((variantClicks / totalClicks) * 100).toFixed(0) : 0;
              const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
              const isWinner = variant.id === bestVariantId?.id && variantClicks > 0;

              return (
                <div
                  key={variant.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    isWinner
                      ? "border-primary/30 bg-primary/[0.04] ring-1 ring-primary/10"
                      : "border-border/80 bg-secondary/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0", color.badge)}>
                        {variant.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{variant.weight}% traffic</span>
                      {isWinner && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md ring-1 ring-warning/20">
                          <Trophy className="h-2.5 w-2.5" /> Leader
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          parseFloat(variantConvRate) > 0 ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {variantConvRate}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">CVR</p>
                    </div>
                  </div>

                  <a
                    href={variant.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate mb-2 group/url"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60 group-hover/url:opacity-100 transition-opacity" />
                    <span className="truncate">{variant.destination_url}</span>
                  </a>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden ring-1 ring-border/60">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", color.bar)}
                        style={{
                          width: totalClicks > 0 ? `${(variantClicks / totalClicks) * 100}%` : "0%",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground shrink-0">
                      {sharePercent}% · {variantClicks}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
            <StatMini icon={MousePointerClick} label="Clicks" value={totalClicks.toLocaleString()} />
            <StatMini icon={Target} label="Conv." value={conversions} />
            <StatMini icon={Percent} label="CVR" value={`${convRate}%`} />
          </div>
        </div>

        <Link
          to={`/links/${link.id}`}
          className="flex items-center justify-between px-4 py-3 border-t border-border text-xs font-medium text-muted-foreground hover:text-primary hover:bg-secondary/30 transition-colors mt-auto"
        >
          <span>View link analytics</span>
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

  const totalWeight = variantList.reduce((sum, v) => sum + Number(v.weight || 0), 0);

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
    <FormDialog
      onClose={onClose}
      title="New A/B Test"
      icon={FlaskConical}
      maxWidth="lg"
      tall
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <FormDialogBody className="space-y-4">
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
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">Variants</label>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-[10px] font-medium tabular-nums",
                    totalWeight === 100 ? "text-success" : "text-warning"
                  )}
                >
                  Weights: {totalWeight}%
                </span>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  + Add variant
                </button>
              </div>
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
        </FormDialogBody>
        <FormDialogFooter>
          <Button type="button" variant="outline" className="flex-1 h-10" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 h-10">
            {saving ? "Creating..." : "Create Test"}
          </Button>
        </FormDialogFooter>
      </form>
    </FormDialog>
  );
}
