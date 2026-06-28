import { useEffect, useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import db from "@/api/openClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getApiOrigin() {
  const apiBase = (/** @type {any} */ (import.meta).env?.VITE_API_BASE_URL) || "/api";
  if (typeof apiBase === "string" && apiBase.startsWith("http")) {
    return apiBase.replace(/\/api\/?$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

export default function McpApiSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showApiKeyField, setShowApiKeyField] = useState(false);
  const [rateLimit, setRateLimit] = useState(60);

  const baseUrl = getApiOrigin();
  const catalogUrl = baseUrl ? `${baseUrl}/api/mcp/v1/catalog` : "/api/mcp/v1/catalog";

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await db.settings.get();
      const config = data?.mcp_api || {};
      setApiKeySet(Boolean(config.api_key_set));
      setApiKey("");
      setShowApiKeyField(!config.api_key_set);
      setRateLimit(Number(config.rate_limit) || 60);
    } catch (err) {
      setError(err?.message || "Failed to load MCP API settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleGenerate = () => {
    setApiKey(generateApiKey());
    setShowApiKeyField(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const patch = {
        rate_limit: Math.max(1, Math.min(1000, Number(rateLimit) || 60)),
      };

      if (apiKey.trim()) {
        patch.api_key = apiKey.trim();
      }

      await db.settings.update({ mcp_api: patch });
      toast.success("MCP API settings saved");
      await loadSettings();
    } catch (err) {
      setError(err?.message || "Failed to save MCP API settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading MCP API settings…</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold">MCP API</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Expose Linkly to EMZI Nexus Brain as a Connected System
          </p>
        </div>

        <div className="space-y-2">
          <Label>Base URL</Label>
          <div className="flex gap-2">
            <Input value={baseUrl} readOnly className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copyValue(baseUrl, "Base URL")}
              aria-label="Copy base URL"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Catalog URL</Label>
          <div className="flex gap-2">
            <Input value={catalogUrl} readOnly className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copyValue(catalogUrl, "Catalog URL")}
              aria-label="Copy catalog URL"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Register this URL in Nexus Brain → Connected Systems → Catalog URL.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mcp-api-key">X-API-Key</Label>
          <div className="flex gap-2">
            <Input
              id="mcp-api-key"
              type={showApiKeyField ? "text" : "password"}
              value={showApiKeyField ? apiKey : apiKeySet ? "••••••••••••••••••••••••••••••••" : ""}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeySet ? "Leave blank to keep existing key" : "Min. 32 characters"}
              className="font-mono text-sm"
              disabled={!showApiKeyField && apiKeySet}
            />
            <Button type="button" variant="outline" onClick={handleGenerate}>
              <KeyRound className="h-4 w-4 mr-1.5" />
              Generate
            </Button>
          </div>
          {apiKeySet && !showApiKeyField && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowApiKeyField(true)}
            >
              Replace API key
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            Sent as <code className="text-xs">X-API-Key</code> on every MCP request from Nexus Brain.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mcp-rate-limit">Rate limit (requests per minute)</Label>
          <Input
            id="mcp-rate-limit"
            type="number"
            min={1}
            max={1000}
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Nexus Brain registration</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Nexus Brain → Connected Systems → Add system</li>
            <li>Set Base URL to the value above</li>
            <li>Paste the same X-API-Key here and in Brain</li>
            <li>Set Catalog URL to the catalog endpoint above</li>
            <li>Verify with: <code className="text-xs">curl -H &quot;X-API-Key: …&quot; {catalogUrl}</code></li>
          </ol>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save MCP API Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
