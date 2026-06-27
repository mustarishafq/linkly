import { useEffect, useState } from "react";
import db from "@/api/openClient";
import { buildQrDesignSnapshot, DEFAULT_QR_DESIGN, normalizeQrDesign } from "@/lib/qrDesignConfig";
import { buildNotificationRulePayload, normalizeNotificationRuleFromApi } from "@/lib/linkNotificationConfig";
import LinkQrStyleSection from "@/components/links/LinkQrStyleSection";
import LinkNotificationSection from "@/components/links/LinkNotificationSection";
import { useAuth } from "@/lib/AuthContext";

import { RefreshCw } from "lucide-react";
import { generateSlug, getShortUrl } from "@/lib/qrcode";
import { isReservedShortLinkSlug } from "@/lib/reservedPaths";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getTestLinkUrl } from "@/lib/linkPreview";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

export default function LinkFormDialog({ link, campaigns, domains = [], onClose, onSaved }) {
  const { user } = useAuth();
  const isEditing = !!link;
  const [form, setForm] = useState({
    title: link?.title || "",
    slug: link?.slug || generateSlug(),
    destination_url: link?.destination_url || "",
    tags: link?.tags?.join(", ") || "",
    campaign_id: link?.campaign_id || "",
    facebook_pixel_id: link?.facebook_pixel_id || "",
    expire_by_date: link?.expire_by_date?.split("T")[0] || "",
    expire_by_clicks: link?.expire_by_clicks || "",
    fallback_url: link?.fallback_url || "",
    custom_domain: link?.custom_domain || "",
  });
  const [saving, setSaving] = useState(false);
  const [qrMode, setQrMode] = useState("default");
  const [orgQrDefault, setOrgQrDefault] = useState(DEFAULT_QR_DESIGN);
  const [customQrForm, setCustomQrForm] = useState({
    ...DEFAULT_QR_DESIGN,
    name: "Custom QR",
  });
  const [notificationExpanded, setNotificationExpanded] = useState(false);
  const [notificationRules, setNotificationRules] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSharedData() {
      try {
        const userData = await db.users.directory();
        if (!cancelled) {
          setDirectoryUsers(userData);
        }
      } catch {
        if (!cancelled) {
          setDirectoryUsers([]);
        }
      }
    }

    loadSharedData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditing || !link?.id) return;

    let cancelled = false;

    async function loadNotificationRules() {
      try {
        const rules = await db.entities.LinkNotificationRule.filter({ link_id: link.id });
        if (!cancelled) {
          setNotificationRules(rules.map(normalizeNotificationRuleFromApi));
        }
      } catch {
        if (!cancelled) {
          setNotificationRules([]);
        }
      }
    }

    loadNotificationRules();

    return () => {
      cancelled = true;
    };
  }, [isEditing, link?.id]);

  useEffect(() => {
    if (isEditing) return;

    let cancelled = false;

    async function loadDefaults() {
      try {
        const [qrData, generalData] = await Promise.all([
          db.settings.getQrDefault(),
          db.settings.getGeneralDefaults(),
        ]);
        if (cancelled) return;

        const normalized = normalizeQrDesign(qrData?.qr_default || DEFAULT_QR_DESIGN);
        setOrgQrDefault(normalized);
        setCustomQrForm((current) => ({
          ...current,
          ...normalized,
          name: "Custom QR",
        }));

        const defaultDomain = generalData?.general?.default_domain || "";
        if (defaultDomain) {
          setForm((current) => ({
            ...current,
            custom_domain: current.custom_domain || defaultDomain,
          }));
        }
      } catch {
        if (!cancelled) {
          setOrgQrDefault(DEFAULT_QR_DESIGN);
        }
      }
    }

    loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  const shortPreview = getShortUrl(form.slug, form.custom_domain);

  async function syncNotificationRules(linkId) {
    if (!linkId || !user?.id) return;

    const validRules = notificationRules.filter((rule) => {
      const notifyType = rule.notify_type || "target";
      if (notifyType === "target") {
        return Number(rule.target_value) > 0;
      }
      return Number(rule.trigger_value) > 0;
    });

    if (isEditing) {
      const existing = await db.entities.LinkNotificationRule.filter({ link_id: linkId });
      const keepIds = new Set(validRules.map((rule) => rule.id).filter(Boolean));

      await Promise.all(
        existing
          .filter((rule) => !keepIds.has(rule.id))
          .map((rule) => db.entities.LinkNotificationRule.delete(rule.id))
      );

      for (const rule of validRules) {
        const payload = buildNotificationRulePayload(rule, linkId, user.id);
        if (rule.id) {
          await db.entities.LinkNotificationRule.update(rule.id, payload);
        } else {
          await db.entities.LinkNotificationRule.create(payload);
        }
      }
      return;
    }

    const payloads = validRules.map((rule) => buildNotificationRulePayload(rule, linkId, user.id));
    if (payloads.length > 0) {
      await db.entities.LinkNotificationRule.bulkCreate(payloads);
    }
  }

  async function performSave() {
    setSaving(true);
    const data = {
      title: form.title,
      slug: form.slug,
      destination_url: form.destination_url,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      campaign_id: form.campaign_id || null,
      facebook_pixel_id: form.facebook_pixel_id || null,
      expire_by_date: form.expire_by_date ? new Date(form.expire_by_date).toISOString() : null,
      expire_by_clicks: form.expire_by_clicks ? Number(form.expire_by_clicks) : null,
      fallback_url: form.fallback_url || null,
      custom_domain: form.custom_domain || null,
      status: "active",
    };

    if (isEditing) {
      await db.entities.ShortLink.update(link.id, data);
      try {
        await syncNotificationRules(link.id);
      } catch {
        toast({
          title: "Updated",
          description: "Link saved but notification rules could not be updated.",
        });
        setSaving(false);
        onSaved();
        onClose();
        return;
      }
      toast({ title: "Updated", description: "Link has been updated" });
    } else {
      const created = await db.entities.ShortLink.create(data);
      const designSource = qrMode === "custom" ? customQrForm : orgQrDefault;
      const snapshot = buildQrDesignSnapshot({
        design: designSource,
        linkId: created.id,
        source: qrMode === "custom" ? "custom" : "global",
      });

      try {
        await db.entities.QRDesign.create(snapshot);
      } catch {
        toast({
          title: "Link created",
          description: "Link was created but QR design could not be saved. Add one from the link detail page.",
        });
        setSaving(false);
        setCreateConfirmOpen(false);
        onSaved();
        onClose();
        return;
      }

      try {
        await syncNotificationRules(created.id);
      } catch {
        toast({
          title: "Created",
          description: "Link created but notification rules could not be saved. Add them from the link detail page.",
        });
        setSaving(false);
        setCreateConfirmOpen(false);
        onSaved();
        onClose();
        return;
      }

      toast({
        title: "Created",
        description: "New short link created with QR design",
        action: (
          <ToastAction
            altText="Test link"
            onClick={() => window.open(getTestLinkUrl(created.slug, created.custom_domain), "_blank", "noopener,noreferrer")}
          >
            Test link
          </ToastAction>
        ),
      });
    }
    setSaving(false);
    setCreateConfirmOpen(false);
    onSaved();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.destination_url) return;

    const normalizedSelectedDomain = String(form.custom_domain || "").toLowerCase();
    const existing = await db.entities.ShortLink.filter({ slug: form.slug }, "-created_date", 50);
    const duplicate = existing.find((item) => {
      if (isEditing && item.id === link.id) return false;
      const existingDomain = String(item.custom_domain || "").toLowerCase();
      return existingDomain === normalizedSelectedDomain;
    });

    if (duplicate) {
      toast({
        title: "Slug already in use",
        description: "This slug is already used for the selected domain. Pick another slug or domain.",
      });
      return;
    }

    if (isReservedShortLinkSlug(form.slug)) {
      toast({
        title: "Reserved slug",
        description: "This slug conflicts with an app route. Choose a different slug.",
      });
      return;
    }

    if (isEditing) {
      await performSave();
      return;
    }

    setCreateConfirmOpen(true);
  }

  const createConfirmDescription =
    qrMode === "custom"
      ? `Create this link with a custom QR design (${customQrForm.name})?`
      : `Create this link using the organization default QR design (${orgQrDefault.name})?`;

  return (
    <>
    <FormDialog
      onClose={onClose}
      title={isEditing ? "Edit Link" : "Create New Link"}
      maxWidth="lg"
      tall
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <FormDialogBody className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title (optional)</label>
            <input
              type="text"
              placeholder="e.g. Raya Promo Landing"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination URL *</label>
            <input
              type="url"
              placeholder="https://example.com/your-page"
              value={form.destination_url}
              onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
              required
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Slug</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, slug: generateSlug() })}
                className="px-3 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-primary mt-1.5 font-mono truncate">{shortPreview}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Short Domain</label>
            <select
              value={form.custom_domain}
              onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Default ({window.location.host})</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain}>{d.domain}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="promo, social, raya"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Campaign</label>
            <select
              value={form.campaign_id}
              onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">No campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Facebook Pixel ID (optional)</label>
            <input
              type="text"
              placeholder="123456789"
              value={form.facebook_pixel_id}
              onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expire by Date</label>
              <input
                type="date"
                value={form.expire_by_date}
                onChange={(e) => setForm({ ...form, expire_by_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expire by Clicks</label>
              <input
                type="number"
                placeholder="1000"
                value={form.expire_by_clicks}
                onChange={(e) => setForm({ ...form, expire_by_clicks: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Fallback URL (after expiry)</label>
            <input
              type="url"
              placeholder="https://example.com/expired"
              value={form.fallback_url}
              onChange={(e) => setForm({ ...form, fallback_url: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {!isEditing && (
            <LinkQrStyleSection
              slug={form.slug}
              customDomain={form.custom_domain}
              qrMode={qrMode}
              onQrModeChange={setQrMode}
              customForm={customQrForm}
              onCustomFormChange={setCustomQrForm}
              orgDefault={orgQrDefault}
            />
          )}
          <LinkNotificationSection
            expanded={notificationExpanded}
            onExpandedChange={setNotificationExpanded}
            rules={notificationRules}
            onRulesChange={setNotificationRules}
            users={directoryUsers}
            currentUserId={user?.id}
          />
        </FormDialogBody>
        <FormDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 h-10">
            {saving ? "Saving..." : isEditing ? "Update Link" : "Create Link"}
          </Button>
        </FormDialogFooter>
      </form>
    </FormDialog>

    <ConfirmDialog
      open={createConfirmOpen}
      onOpenChange={setCreateConfirmOpen}
      title="Create link?"
      description={createConfirmDescription}
      confirmLabel={saving ? "Creating…" : "Create link"}
      onConfirm={performSave}
    />
    </>
  );
}