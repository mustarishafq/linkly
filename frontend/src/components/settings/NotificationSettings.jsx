import { useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
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

function generateWebhookId() {
  return crypto.randomUUID();
}

function createEmptyWebhook() {
  return {
    id: generateWebhookId(),
    name: "Nexus Brain",
    url: "",
    secret: "",
    secret_set: false,
    enabled: false,
    events: buildDefaultWebhookEvents(),
    showSecretField: true,
  };
}

function normalizeWebhookFromApi(webhook) {
  return {
    id: webhook.id || generateWebhookId(),
    name: webhook.name || "Nexus Brain",
    url: webhook.url || "",
    secret: "",
    secret_set: Boolean(webhook.secret_set),
    enabled: Boolean(webhook.enabled),
    events: {
      ...buildDefaultWebhookEvents(),
      ...(webhook.events || {}),
    },
    showSecretField: !webhook.secret_set,
  };
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [error, setError] = useState("");
  const [webhooks, setWebhooks] = useState([]);
  const [persistedWebhookIds, setPersistedWebhookIds] = useState(() => new Set());

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await db.settings.get();
      const config = data?.event_webhook || {};
      const items = Array.isArray(config.webhooks) ? config.webhooks : [];

      setWebhooks(items.length > 0 ? items.map(normalizeWebhookFromApi) : [createEmptyWebhook()]);
      setPersistedWebhookIds(new Set(items.map((webhook) => webhook.id).filter(Boolean)));
    } catch (err) {
      setError(err?.message || "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const patchWebhook = (index, patch) => {
    setWebhooks((current) =>
      current.map((webhook, idx) => (idx === index ? { ...webhook, ...patch } : webhook))
    );
  };

  const handleGenerate = (index) => {
    patchWebhook(index, { secret: generateWebhookSecret(), showSecretField: true });
  };

  const toggleEvent = (index, eventId, checked) => {
    setWebhooks((current) =>
      current.map((webhook, idx) =>
        idx === index ? { ...webhook, events: { ...webhook.events, [eventId]: checked } } : webhook
      )
    );
  };

  const addWebhook = () => {
    setWebhooks((current) => [...current, createEmptyWebhook()]);
  };

  const removeWebhook = (index) => {
    setWebhooks((current) => {
      if (current.length <= 1) {
        return [createEmptyWebhook()];
      }

      return current.filter((_, idx) => idx !== index);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = webhooks.map(({ showSecretField, secret_set, ...webhook }) => {
        const item = {
          id: webhook.id,
          name: webhook.name.trim(),
          url: webhook.url.trim(),
          enabled: webhook.enabled,
          events: webhook.events,
        };

        if (webhook.secret.trim()) {
          item.secret = webhook.secret.trim();
        }

        return item;
      });

      await db.settings.update({ event_webhook: { webhooks: payload } });
      toast.success("Notification settings saved");
      await loadSettings();
    } catch (err) {
      setError(err?.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (index) => {
    const webhook = webhooks[index];
    setTestingId(webhook.id);
    setError("");

    if (!persistedWebhookIds.has(webhook.id)) {
      setError("Save notification settings before sending a test.");
      setTestingId("");
      return;
    }

    try {
      await db.settings.testEventWebhook(webhook.id);
      toast.success("Test webhook sent");
    } catch (err) {
      setError(err?.message || "Test webhook delivery failed");
    } finally {
      setTestingId("");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading notification settings…</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Event webhooks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send {APP_NAME} activity to Nexus Brain or another notification hub.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addWebhook}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add webhook
        </Button>
      </div>

      {webhooks.map((webhook, index) => (
        <div key={webhook.id} className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{webhook.name || "Webhook destination"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{webhook.id}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={webhook.enabled}
                onCheckedChange={(enabled) => patchWebhook(index, { enabled })}
              />
              {webhooks.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeWebhook(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`webhook-name-${webhook.id}`}>Destination name</Label>
            <Input
              id={`webhook-name-${webhook.id}`}
              value={webhook.name}
              onChange={(e) => patchWebhook(index, { name: e.target.value })}
              placeholder="Nexus Brain"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`webhook-url-${webhook.id}`}>Webhook URL</Label>
            <Input
              id={`webhook-url-${webhook.id}`}
              value={webhook.url}
              onChange={(e) => patchWebhook(index, { url: e.target.value })}
              placeholder="https://hub.example.com/api/webhooks/inbound"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              HTTPS endpoint that accepts POST requests with an{" "}
              <code className="text-xs">X-Webhook-Secret</code> header.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`webhook-secret-${webhook.id}`}>Shared secret</Label>
            <div className="flex gap-2">
              <Input
                id={`webhook-secret-${webhook.id}`}
                type={webhook.showSecretField ? "text" : "password"}
                value={
                  webhook.showSecretField
                    ? webhook.secret
                    : webhook.secret_set
                      ? "••••••••••••••••••••••••••••••••"
                      : ""
                }
                onChange={(e) => patchWebhook(index, { secret: e.target.value })}
                placeholder={webhook.secret_set ? "Leave blank to keep existing secret" : "Min. 32 characters"}
                className="font-mono text-sm"
                disabled={!webhook.showSecretField && webhook.secret_set}
              />
              <Button type="button" variant="outline" onClick={() => handleGenerate(index)}>
                <KeyRound className="h-4 w-4 mr-1.5" />
                Generate
              </Button>
            </div>
            {webhook.secret_set && !webhook.showSecretField && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => patchWebhook(index, { showSecretField: true })}
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
                    checked={Boolean(webhook.events[event.id])}
                    onCheckedChange={(checked) => toggleEvent(index, event.id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleTest(index)}
            disabled={testingId === webhook.id || !webhook.enabled}
          >
            {testingId === webhook.id ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending test…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send test
              </>
            )}
          </Button>
        </div>
      ))}

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
  );
}
