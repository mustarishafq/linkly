// @ts-nocheck
import db from "@/api/openClient";
import { useEffect, useState } from "react";
import { Globe, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Copy } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

function generateVerificationToken() {
  return Math.random().toString(36).slice(2, 14);
}

function normalizeDomainInput(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return "";

  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const normalized = withoutProtocol.replace(/\/$/, "").split("/")[0];
  return normalized;
}

function isValidHostname(value) {
  if (!value || value.length > 253) return false;
  if (value.includes(" ")) return false;
  // Hostname labels: letters, numbers, hyphen (not starting/ending with hyphen)
  return value
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

export default function Domains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    loadDomains();
  }, [user?.id, user?.role]);

  async function loadDomains() {
    setLoading(true);
    const all = await db.entities.CustomDomain.list("-created_date", 300);
    const visible = all.filter((item) => user?.role === "admin" || item.owner_user_id === user?.id);
    setDomains(visible);
    setLoading(false);
  }

  async function addDomain(e) {
    e.preventDefault();
    const normalized = normalizeDomainInput(domainInput);
    if (!normalized || !isValidHostname(normalized)) {
      toast({ title: "Invalid domain", description: "Please enter a valid hostname, e.g. go.yourbrand.com" });
      return;
    }

    if (domains.some((d) => String(d.domain || "").toLowerCase() === normalized)) {
      toast({ title: "Already exists", description: "This domain is already registered." });
      return;
    }

    setSaving(true);
    const token = generateVerificationToken();
    await db.entities.CustomDomain.create({
      domain: normalized,
      owner_user_id: user?.id || null,
      is_active: true,
      status: "active",
      verification_token: token,
      verification_name: `_linkly.${normalized}`,
      verification_value: `linkly-verification=${token}`,
      verification_status: "pending",
      verification_last_checked_date: null,
      verification_verified_date: null,
      verification_error: null,
    });
    setDomainInput("");
    setSaving(false);
    await loadDomains();
    toast({ title: "Domain added", description: "You can now choose this domain when creating links." });
  }

  async function verifyDomain(domain) {
    setVerifyingId(domain.id);
    try {
      const result = await db.domains.verify(domain.id);
      toast({
        title: result?.verified ? "Domain verified" : "Verification pending",
        description: result?.verified
          ? "TXT record found. Domain is verified."
          : "TXT record not found yet. DNS propagation may still be in progress.",
      });
      await loadDomains();
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error?.message || "Unable to verify DNS TXT record.",
      });
    } finally {
      setVerifyingId("");
    }
  }

  async function copyText(value, label) {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied.` });
  }

  async function toggleActive(domain) {
    await db.entities.CustomDomain.update(domain.id, {
      is_active: !(domain.is_active !== false),
      status: domain.is_active !== false ? "inactive" : "active",
    });
    await loadDomains();
  }

  async function removeDomain(id) {
    await db.entities.CustomDomain.delete(id);
    await loadDomains();
    toast({ title: "Domain removed" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom Domains</h1>
        <p className="text-muted-foreground mt-1">Register domains and choose which one to use per short link.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-3">Add Domain</h2>
        <form onSubmit={addDomain} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="go.yourbrand.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Adding..." : "Add Domain"}
          </button>
        </form>
        <div className="mt-3 text-xs text-muted-foreground">
          Point your domain DNS to this app host (via CNAME or reverse proxy), then use URLs like <span className="font-mono">https://your-domain.com/r/slug</span>.
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Registered Domains</h2>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : domains.length === 0 ? (
          <div className="p-10 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="mt-3 font-medium">No custom domains yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add one above to start using branded short links.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {domains.map((domain) => (
              <div key={domain.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold font-mono">{domain.domain}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {domain.is_active !== false ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                    {domain.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> DNS Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3.5 w-3.5" /> DNS Pending
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">/r/slug path is required</span>
                  </div>
                  <div className="mt-2 space-y-1 rounded-md border border-border bg-background p-2">
                    <div className="text-[11px] text-muted-foreground">Add TXT record:</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold">Name</span>
                      <span className="font-mono">{domain.verification_name || `_linkly.${domain.domain}`}</span>
                      <button
                        type="button"
                        onClick={() => copyText(domain.verification_name || `_linkly.${domain.domain}`, "TXT name")}
                        className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 hover:bg-secondary"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold">Value</span>
                      <span className="font-mono">{domain.verification_value || `linkly-verification=${domain.verification_token || ""}`}</span>
                      <button
                        type="button"
                        onClick={() => copyText(domain.verification_value || `linkly-verification=${domain.verification_token || ""}`, "TXT value")}
                        className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 hover:bg-secondary"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    {domain.verification_error && domain.verification_status !== "verified" && (
                      <div className="text-[11px] text-amber-600">Last check: {domain.verification_error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => verifyDomain(domain)}
                    disabled={verifyingId === domain.id}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    {verifyingId === domain.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Verify DNS
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(domain)}
                    className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary"
                  >
                    {domain.is_active !== false ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDomain(domain.id)}
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    title="Delete domain"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
