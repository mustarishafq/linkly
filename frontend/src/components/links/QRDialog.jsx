import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import db from "@/api/openClient";
import { getShortUrl } from "@/lib/qrcode";
import { toast } from "sonner";
import QRCodePreview, { prepareQRDesign } from "@/components/qr/QRCodePreview";
import FormDialog, { FormDialogBody } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PREVIEW_SIZE = 192;
const CONTAINER_SIZE = PREVIEW_SIZE + 32;

export default function QRDialog({ link, onClose }) {
  const shortUrl = getShortUrl(link.slug, link.custom_domain);
  const previewRef = useRef(null);
  const qrExportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [prepared, setPrepared] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPrepared(null);

    async function load() {
      let activeDesign = null;

      try {
        const designs = await db.entities.QRDesign.filter(
          { link_id: link.id, is_active: true },
          "-created_date",
          1
        );
        activeDesign = designs?.[0] || null;
      } catch {
        activeDesign = null;
      }

      if (cancelled) return;

      const result = await prepareQRDesign(activeDesign);
      if (cancelled) return;

      setPrepared(result);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [link.id]);

  function handleQrReady() {
    setLoading(false);
  }

  function downloadPng() {
    const canvas = previewRef.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("QR not ready", { description: "Please wait and try again." });
      return;
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${link.slug}.png`;
      a.click();
    } catch {
      toast.error("Download failed", {
        description: "Logo host may block export (CORS). Use a CORS-enabled logo URL.",
      });
    }
  }

  async function downloadSvg() {
    const qr = qrExportRef.current;
    if (!qr) {
      toast.error("QR not ready", { description: "Please wait and try again." });
      return;
    }

    try {
      await qr.download({ name: `qr-${link.slug}`, extension: "svg" });
    } catch {
      toast.error("Download failed", {
        description: "Logo host may block export (CORS). Use a CORS-enabled logo URL.",
      });
    }
  }

  const bgColor = prepared?.design.bg_color || "#ffffff";

  return (
    <FormDialog onClose={onClose} title="QR Code" maxWidth="sm">
      <FormDialogBody className="flex flex-col items-center gap-4">
        <div
          className="relative rounded-xl p-4 border border-border flex items-center justify-center"
          style={{ background: bgColor, width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {prepared && (
            <div
              className={cn(
                "transition-opacity duration-200",
                loading ? "opacity-0" : "opacity-100"
              )}
            >
              <QRCodePreview
                key={`${link.id}-${prepared.resolvedLogoUrl}`}
                value={shortUrl}
                design={prepared.design}
                size={Number(prepared.design.size) || 400}
                displaySize={PREVIEW_SIZE}
                containerRef={previewRef}
                preloadedLogoUrl={prepared.resolvedLogoUrl}
                qrExportRef={qrExportRef}
                onReady={handleQrReady}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground font-mono text-center break-all">{shortUrl}</p>
        <div className="flex gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 gap-2"
            onClick={downloadPng}
            disabled={loading}
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 gap-2"
            onClick={downloadSvg}
            disabled={loading}
          >
            <Download className="h-3.5 w-3.5" /> SVG
          </Button>
        </div>
      </FormDialogBody>
    </FormDialog>
  );
}
