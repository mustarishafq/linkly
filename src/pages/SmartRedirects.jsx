import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Plus, Route, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ruleTypeLabels = { country: "Country", device: "Device", schedule: "Schedule" };
  const ruleTypeColors = {
    country: "bg-blue-50 text-blue-600",
    device: "bg-purple-50 text-purple-600",
    schedule: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Redirects</h1>
          <p className="text-muted-foreground mt-1">Redirect based on country, device, or schedule</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Route className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="mt-4 text-lg font-medium">No redirect rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create smart rules to redirect visitors dynamically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={cn("bg-card rounded-xl border border-border p-4 transition-opacity", !rule.is_active && "opacity-50")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider", ruleTypeColors[rule.rule_type])}>
                      {ruleTypeLabels[rule.rule_type]}
                    </span>
                    <span className="text-sm font-medium">
                      When {rule.rule_type} = "{rule.condition_value}"
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link: <span className="font-mono text-primary">/{linkMap[rule.link_id]?.slug || "unknown"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    → {rule.redirect_url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRule(rule)}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-medium border transition-colors",
                      rule.is_active ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {rule.is_active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-2 rounded-lg hover:bg-secondary">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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

  const conditionHints = {
    country: "e.g. MY, US, SG",
    device: "e.g. Mobile, Desktop, Tablet",
    schedule: "e.g. 09:00-17:00",
  };

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
          <h2 className="font-semibold">New Redirect Rule</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Link</label>
            <select
              value={form.link_id}
              onChange={(e) => setForm({ ...form, link_id: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>/{l.slug} — {l.title || l.destination_url}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rule Type</label>
            <select
              value={form.rule_type}
              onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              <option value="country">Country</option>
              <option value="device">Device Type</option>
              <option value="schedule">Time Schedule</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Condition Value <span className="text-muted-foreground/60">({conditionHints[form.rule_type]})</span>
            </label>
            <input
              type="text"
              value={form.condition_value}
              onChange={(e) => setForm({ ...form, condition_value: e.target.value })}
              required
              placeholder={conditionHints[form.rule_type]}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Redirect URL</label>
            <input
              type="url"
              value={form.redirect_url}
              onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
              required
              placeholder="https://wa.me/60123456789"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Priority (higher = checked first)</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Creating..." : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}