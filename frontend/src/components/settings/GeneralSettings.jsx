import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import db from "@/api/openClient";
import { DEFAULT_GENERAL_SETTINGS, TIMEZONE_OPTIONS, APP_NAME } from "@/lib/settingsConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [domains, setDomains] = useState([]);
  const [form, setForm] = useState({ ...DEFAULT_GENERAL_SETTINGS });

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsData, domainRows] = await Promise.all([
        db.settings.get(),
        db.entities.CustomDomain.list("-created_date", 100),
      ]);

      const config = settingsData?.general || {};
      setForm({
        organization_name: config.organization_name || DEFAULT_GENERAL_SETTINGS.organization_name,
        default_domain: config.default_domain || "",
        brand_primary: config.brand_primary || DEFAULT_GENERAL_SETTINGS.brand_primary,
        timezone: config.timezone || DEFAULT_GENERAL_SETTINGS.timezone,
      });
      setDomains(domainRows || []);
    } catch (err) {
      setError(err?.message || "Failed to load general settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await db.settings.update({
        general: {
          organization_name: form.organization_name.trim(),
          default_domain: form.default_domain,
          brand_primary: form.brand_primary,
          timezone: form.timezone,
        },
      });
      toast.success("General settings saved");
      await loadSettings();
    } catch (err) {
      setError(err?.message || "Failed to save general settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading general settings…</p>;
  }

  const verifiedDomains = domains.filter(
    (domain) => domain.verification_status === "verified" && domain.is_active !== false
  );

  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold">Organization</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Workspace identity and defaults used across {APP_NAME}.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={form.organization_name}
            onChange={(e) => setForm((current) => ({ ...current, organization_name: e.target.value }))}
            placeholder="Your company or team name"
          />
        </div>

        <div className="space-y-2">
          <Label>Default short-link domain</Label>
          <Select
            value={form.default_domain || "__platform__"}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                default_domain: value === "__platform__" ? "" : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Platform default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__platform__">Platform default</SelectItem>
              {verifiedDomains.map((domain) => (
                <SelectItem key={domain.id} value={domain.domain}>
                  {domain.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pre-selected when creating new links. Add and verify domains on the Domains page first.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand-primary">Brand color</Label>
            <div className="flex items-center gap-2">
              <input
                id="brand-primary"
                type="color"
                value={form.brand_primary}
                onChange={(e) => setForm((current) => ({ ...current, brand_primary: e.target.value }))}
                className="h-9 w-12 rounded-md border border-border bg-background cursor-pointer"
              />
              <Input
                value={form.brand_primary}
                onChange={(e) => setForm((current) => ({ ...current, brand_primary: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={form.timezone}
              onValueChange={(value) => setForm((current) => ({ ...current, timezone: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>
                    {timezone.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save General Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
