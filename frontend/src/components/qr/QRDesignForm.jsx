import { useRef, useState } from "react";
import { getShortUrl } from "@/lib/qrcode";
import QRCodePreview from "./QRCodePreview";
import QRDesignFields from "./QRDesignFields";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";

export default function QRDesignForm({ design, linkSlug, linkDomain, onClose, onSave }) {
  const [form, setForm] = useState({
    name: design?.name || "My QR Design",
    fg_color: design?.fg_color || "#000000",
    bg_color: design?.bg_color || "#ffffff",
    eye_color: design?.eye_color || "#000000",
    style: design?.style || "square",
    size: design?.size || 300,
    logo_size: Number(design?.logo_size ?? 20),
    logo_url: design?.logo_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const previewRef = useRef(null);

  const shortUrl = getShortUrl(linkSlug, linkDomain);

  async function performSave() {
    setSaving(true);
    await onSave({
      ...form,
      size: Number(form.size),
      logo_size: Number(form.logo_size ?? 20),
    });
    setSaving(false);
    setConfirmOpen(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  function handleDownloadPng() {
    const canvas = previewRef.current?.querySelector("canvas");
    if (!canvas) {
      toast({ title: "Preview not ready", description: "Please wait and try again." });
      return;
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-design-${(form.name || "design").toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
      toast({ title: "Downloaded", description: "QR image downloaded as PNG." });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Logo host may block canvas export (CORS). Use a CORS-enabled logo URL.",
      });
    }
  }

  return (
    <>
      <FormDialog
        onClose={onClose}
        title={design ? "Edit QR Design" : "Create QR Design"}
        maxWidth="2xl"
        tall
      >
        <FormDialogBody className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <QRDesignFields form={form} setForm={setForm} />
              <FormDialogFooter className="border-0 px-0 py-0 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-10" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 h-10">
                  {saving ? "Saving..." : design ? "Update Design" : "Create Design"}
                </Button>
              </FormDialogFooter>
            </form>

            <div className="flex flex-col items-center gap-4 w-full">
              <p className="text-xs font-medium text-muted-foreground self-start">Live Preview</p>
              <div className="rounded-xl p-6 border border-border flex items-center justify-center w-full max-w-[320px]" style={{ background: form.bg_color }}>
                <QRCodePreview
                  value={shortUrl}
                  design={form}
                  size={Number(form.size) || 300}
                  displaySize={192}
                  containerRef={previewRef}
                />
              </div>
              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full max-w-[320px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Download PNG
              </button>
              <p className="text-xs text-muted-foreground text-center">Preview updates as you change settings</p>
            </div>
        </FormDialogBody>
      </FormDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={design ? "Update QR design?" : "Create QR design?"}
        description={
          design
            ? `Save changes to "${form.name}"? This updates the stored design for this link.`
            : `Create "${form.name}" for this link?`
        }
        confirmLabel={saving ? "Saving…" : design ? "Update" : "Create"}
        onConfirm={performSave}
      />
    </>
  );
}
