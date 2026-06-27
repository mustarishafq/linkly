import { useEffect, useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import db from "@/api/openClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function generateClientSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function NexusSsoSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [issuer, setIssuer] = useState("");
  const [defaultRole, setDefaultRole] = useState("user");
  const [secret, setSecret] = useState("");
  const [secretSet, setSecretSet] = useState(false);
  const [showSecretField, setShowSecretField] = useState(false);

  const ssoEndpoint =
    typeof window !== "undefined" ? `${window.location.origin}/sso/nexus` : "/sso/nexus";

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await db.settings.get();
      const config = data?.nexus_sso || {};
      setEnabled(Boolean(config.enabled));
      setIssuer(config.issuer || "");
      setDefaultRole(config.default_role === "admin" ? "admin" : "user");
      setSecretSet(Boolean(config.secret_set));
      setSecret("");
      setShowSecretField(!config.secret_set);
    } catch (err) {
      setError(err?.message || "Failed to load SSO settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(ssoEndpoint);
      toast.success("SSO endpoint copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleGenerate = () => {
    setSecret(generateClientSecret());
    setShowSecretField(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const patch = {
        enabled,
        issuer: issuer.trim(),
        default_role: defaultRole,
      };

      if (secret.trim()) {
        patch.secret = secret.trim();
      }

      await db.settings.update({ nexus_sso: patch });
      toast.success("SSO settings saved");
      await loadSettings();
    } catch (err) {
      setError(err?.message || "Failed to save SSO settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading SSO settings…</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Enable Nexus SSO</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Allow users to sign in via EMZI Nexus Brain
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>SSO Endpoint</Label>
          <div className="flex gap-2">
            <Input value={ssoEndpoint} readOnly className="font-mono text-sm" />
            <Button type="button" variant="outline" size="icon" onClick={copyEndpoint} aria-label="Copy SSO endpoint">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Register this URL as the Base URL / SSO Endpoint in Nexus Brain Connected Systems.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sso-secret">API Key (Shared Secret)</Label>
          <div className="flex gap-2">
            <Input
              id="sso-secret"
              type={showSecretField ? "text" : "password"}
              value={showSecretField ? secret : secretSet ? "••••••••••••••••••••••••••••••••" : ""}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={secretSet ? "Leave blank to keep existing secret" : "Min. 32 characters"}
              className="font-mono text-sm"
              disabled={!showSecretField && secretSet}
            />
            <Button type="button" variant="outline" onClick={handleGenerate}>
              <KeyRound className="h-4 w-4 mr-1.5" />
              Generate
            </Button>
          </div>
          {secretSet && !showSecretField && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowSecretField(true)}
            >
              Replace secret
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            Must match the API key configured in Nexus Brain for this connected system.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sso-issuer">Expected Issuer URL</Label>
          <Input
            id="sso-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="https://emzinexus.com"
          />
          <p className="text-xs text-muted-foreground">
            JWT <code className="text-xs">iss</code> claim must match exactly. Leave empty to skip issuer validation.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Default role for new SSO users</Label>
          <Select value={defaultRole} onValueChange={setDefaultRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save SSO Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
