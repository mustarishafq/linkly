import { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";
import db from "@/api/openClient";
import { getShortUrl } from "@/lib/qrcode";
import { toast } from "@/components/ui/use-toast";
import QRCodePreview from "@/components/qr/QRCodePreview";

export default function QRDialog({ link, onClose }) {
  const shortUrl = getShortUrl(link.slug, link.custom_domain);
  const [loading, setLoading] = useState(true);
  const [activeDesign, setActiveDesign] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    async function loadActiveDesign() {
      try {
        const designs = await db.entities.QRDesign.filter({ link_id: link.id, is_active: true }, "-created_date", 1);
        setActiveDesign(designs?.[0] || null);
      } catch {
        setActiveDesign(null);
      } finally {
        setLoading(false);
      }
    }

    loadActiveDesign();
  }, [link.id]);

  function downloadPng() {
    const canvas = previewRef.current?.querySelector("canvas");
    if (!canvas) {
      toast({ title: "QR not ready", description: "Please wait and try again." });
      return;
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${link.slug}.png`;
      a.click();
    } catch {
      toast({
        title: "Download failed",
        description: "Logo host may block export (CORS). Use a CORS-enabled logo URL.",
      });
    }
  }

  function downloadSvg() {
    toast({
      title: "Use PNG for full design",
      description: "SVG export for custom logo designs is not supported in this dialog yet.",
    });
  }

  const mergedDesign = {
    fg_color: activeDesign?.fg_color || "#000000",
    bg_color: activeDesign?.bg_color || "#ffffff",
    eye_color: activeDesign?.eye_color || "#000000",
    style: activeDesign?.style || "square",
    logo_url: activeDesign?.logo_url || "",
    logo_size: activeDesign?.logo_size ?? 20,
    size: activeDesign?.size || 400,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">QR Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="rounded-xl p-4 border border-border" style={{ background: mergedDesign.bg_color }}>
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <QRCodePreview
                value={shortUrl}
                design={mergedDesign}
                size={Number(mergedDesign.size) || 400}
                displaySize={192}
                containerRef={previewRef}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">{shortUrl}</p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={downloadPng}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}