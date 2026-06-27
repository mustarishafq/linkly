import { useState } from "react";
import { ChevronDown, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { getShortUrl } from "@/lib/qrcode";
import { DEFAULT_QR_DESIGN, normalizeQrDesign } from "@/lib/qrDesignConfig";
import QRCodePreview from "@/components/qr/QRCodePreview";
import QRDesignFields from "@/components/qr/QRDesignFields";

export default function LinkQrStyleSection({
  slug,
  customDomain,
  qrMode,
  onQrModeChange,
  customForm,
  onCustomFormChange,
  orgDefault,
}) {
  const [expanded, setExpanded] = useState(false);
  const shortUrl = getShortUrl(slug, customDomain);
  const defaultDesign = normalizeQrDesign(orgDefault || DEFAULT_QR_DESIGN);
  const activePreviewDesign = qrMode === "custom" ? customForm : defaultDesign;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <QrCode className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">QR Code Style</p>
            <p className="text-xs text-muted-foreground truncate">
              {qrMode === "custom" ? "Custom design" : defaultDesign.name}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onQrModeChange("default")}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                qrMode === "default"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-secondary"
              )}
            >
              Organization default
            </button>
            <button
              type="button"
              onClick={() => onQrModeChange("custom")}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                qrMode === "custom"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-secondary"
              )}
            >
              Custom
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div
              className="rounded-lg border border-border p-2 shrink-0"
              style={{ background: activePreviewDesign.bg_color }}
            >
              <QRCodePreview
                value={shortUrl}
                design={activePreviewDesign}
                size={Number(activePreviewDesign.size) || 300}
                displaySize={80}
              />
            </div>

            {qrMode === "custom" ? (
              <div className="flex-1 min-w-0">
                <QRDesignFields
                  form={customForm}
                  setForm={onCustomFormChange}
                />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground space-y-1 pt-1">
                <p className="font-medium text-foreground">{defaultDesign.name}</p>
                <p className="capitalize">{defaultDesign.style} · {defaultDesign.size}px</p>
                <p>Uses your organization&apos;s default QR design. You can change it later on the link detail page.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
