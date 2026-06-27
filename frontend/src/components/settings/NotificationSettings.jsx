import { useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import db from "@/api/openClient";
import { buildDefaultWebhookEvents, WEBHOOK_EVENT_OPTIONS, APP_NAME } from "@/lib/settingsConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

function generateWebhookSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `whsec_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("Nexus Brain");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [secretSet, setSecretSet] = useState(false);
  const [showSecretField, setShowSecretField] = useState(false);
  const [events, setEvents] = useState(buildDefaultWebhookEvents());

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await db.settings.get();
      const config = data?.event_webhook || {};
      setEnabled(Boolean(config.enabled));
      setName(config.name || "Nexus Brain");
      setUrl(config.url || "");
      setSecretSet(Boolean(config.secret_set));
      setSecret("");
      setShowSecretField(!config.secret_set);
      setEvents({
        ...buildDefaultWebhookEvents(),
        ...(config.events || {}),
      });
    } catch (err) {
      setError(err?.message || "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleGenerate = () => {
    setSecret(generateWebhookSecret());
    setShowSecretField(true);
  };

  const toggleEvent = (eventId, checked) => {
    setEvents((current) => ({ ...current, [eventId]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const patch = {
        enabled,
        name: name.trim(),
        url: url.trim(),
        events,
      };

      if (secret.trim()) {
        patch.secret = secret.trim();
      }

      await db.settings.update({ event_webhook: patch });
      toast.success("Notification settings saved");
      await loadSettings();
    } catch (err) {
      setError(err?.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading notification settings…</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Event webhooks</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Send {APP_NAME} activity to Nexus Brain or another notification hub.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-name">Destination name</Label>
          <Input
            id="webhook-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nexus Brain"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hub.example.com/api/webhooks/inbound"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            HTTPS endpoint that accepts POST requests with an <code className="text-xs">X-Webhook-Secret</code> header.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-secret">Shared secret</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-secret"
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
        </div>

        <div className="space-y-3">
          <div>
            <Label>Subscribed events</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which {APP_NAME} events should trigger outbound notifications.
            </p>
          </div>
          <div className="space-y-2">
            {WEBHOOK_EVENT_OPTIONS.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
                <Switch
                  checked={Boolean(events[event.id])}
                  onCheckedChange={(checked) => toggleEvent(event.id, checked)}
                />
              </div>
            ))}
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
            "Save Notification Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
