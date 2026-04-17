import db from "@/api/openClient";

import { useEffect, useState } from "react";

import {
  Plus,
  Route,
  Trash2,
  X,
  Globe,
  Smartphone,
  Clock,
  ArrowRight,
  Link2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const RULE_META = {
  country: {
    label: "Country",
    icon: Globe,
    badge: "bg-blue-100 text-blue-600",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    hint: "e.g. MY, US, SG",
    placeholder: "Country code (MY, US, SG…)",
  },
  device: {
    label: "Device",
    icon: Smartphone,
    badge: "bg-violet-100 text-violet-600",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    hint: "e.g. Mobile, Desktop, Tablet",
    placeholder: "Device type (Mobile, Desktop…)",
  },
  schedule: {
    label: "Schedule",
    icon: Clock,
    badge: "bg-amber-100 text-amber-600",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    hint: "e.g. 09:00-17:00",
    placeholder: "Time range (09:00-17:00)",
  },
};

export default function SmartRedirects() {
  const [rules, setRules] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  async function toggleRule(rule) {
    await db.entities.RedirectRule.update(rule.id, { is_active: !rule.is_active });
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    );
  }

  const linkMap = {};
  links.forEach((l) => (linkMap[l.id] = l));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeRules = rules.filter((r) => r.is_active).length;
  const rulesByType = {
    country: rules.filter((r) => r.rule_type === "country").length,
    device: rules.filter((r) => r.rule_type === "device").length,
    schedule: rules.filter((r) => r.rule_type === "schedule").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Redirects</h1>
          <p className="text-muted-foreground mt-1 text-sm">Redirect visitors based on country, device, or schedule</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> New Rule
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Route className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{rules.length}</p>
            <p className="text-[11px] text-muted-foreground">Total Rules</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{activeRules}</p>
            <p className="text-[11px] text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Globe className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{rulesByType.country}</p>
            <p className="text-[11px] text-muted-foreground">Country</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Smartphone className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{rulesByType.device}</p>
            <p className="text-[11px] text-muted-foreground">Device</p>
          </div>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Route className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-semibold">No redirect rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create smart rules to redirect visitors dynamically</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const meta = RULE_META[rule.rule_type] || RULE_META.country;
            const Icon = meta.icon;
            const link = linkMap[rule.link_id];

            return (
              <div
                key={rule.id}
                className={cn(
                  "bg-card rounded-2xl border transition-all duration-200",
                  rule.is_active
                    ? "border-border hover:border-primary/20 hover:shadow-md"
                    : "border-border opacity-50"
                )}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.iconBg)}>
                    <Icon className={cn("h-4 w-4", meta.iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", meta.badge)}>
                        {meta.label}
                      </span>
                      <span className="text-sm font-semibold">
                        {rule.condition_value}
                      </span>
                      {rule.priority > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                          Priority {rule.priority}
                        </span>
                      )}
                    </div>

                    {/* Link + redirect */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="font-mono text-primary">/{link?.slug || "unknown"}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <a
                        href={rule.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors truncate group/url"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/url:opacity-100 transition-opacity" />
                        <span className="truncate max-w-[200px] sm:max-w-xs">{rule.redirect_url}</span>
                      </a>
                    </div>
                  </div>

                  {/* Toggle + Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule)}
                      className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={{}}
                      title={rule.is_active ? "Disable rule" : "Enable rule"}
                    >
                      {rule.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4 text-emerald-500" />
                          <span className="text-emerald-600 hidden sm:inline">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground hidden sm:inline">Inactive</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 rounded-lg hover:bg-red-50 hover:text-destructive transition-colors text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <RedirectRuleForm links={links} onClose={() => setShowForm(false)} onSaved={loadData} />
      )}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Route className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="font-semibold">New Redirect Rule</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Link</label>
            <select
              value={form.link_id}
              onChange={(e) => setForm({ ...form, link_id: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>/{l.slug} — {l.title || l.destination_url}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Rule Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {Object.entries(RULE_META).map(([type, m]) => {
                const Icon = m.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, rule_type: type, condition_value: "" })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors",
                      form.rule_type === type
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Condition Value
              <span className="ml-1 text-muted-foreground/60">({meta.hint})</span>
            </label>
            <input
              type="text"
              value={form.condition_value}
              onChange={(e) => setForm({ ...form, condition_value: e.target.value })}
              required
              placeholder={meta.placeholder}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Redirect URL</label>
            <input
              type="url"
              value={form.redirect_url}
              onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
              required
              placeholder="https://example.com/landing"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Priority <span className="text-muted-foreground/60">(higher = checked first)</span></label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
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
              {saving ? "Creating..." : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}