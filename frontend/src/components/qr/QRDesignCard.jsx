import { CheckCircle, Edit, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getShortUrl } from "@/lib/qrcode";
import QRCodePreview from "./QRCodePreview";

export default function QRDesignCard({ design, linkSlug, linkDomain, onSetActive, onEdit, onDelete }) {
  const shortUrl = getShortUrl(linkSlug, linkDomain);

  return (
    <div className={cn(
      "bg-card rounded-xl border p-4 flex flex-col gap-3 transition-all",
      design.is_active ? "border-primary ring-1 ring-primary/30" : "border-border"
    )}>
      {design.is_active && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <CheckCircle className="h-3.5 w-3.5" />
          Active Design
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="rounded-lg overflow-hidden border border-border bg-white p-2 shrink-0">
          <QRCodePreview value={shortUrl} design={design} size={300} displaySize={80} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{design.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{design.style || "square"}</span>
            <span className="text-[11px] text-muted-foreground">{design.size || 300}px</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="h-4 w-4 rounded border border-border" style={{ background: design.fg_color || "#000" }} title="Foreground" />
            <div className="h-4 w-4 rounded border border-border" style={{ background: design.bg_color || "#fff" }} title="Background" />
            <div className="h-4 w-4 rounded border border-border" style={{ background: design.eye_color || "#000" }} title="Eye color" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {!design.is_active && (
          <button
            onClick={() => onSetActive(design)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Star className="h-3 w-3" /> Set Active
          </button>
        )}
        <button
          onClick={() => onEdit(design)}
          className="inline-flex items-center justify-center p-2 rounded-lg border border-border text-xs hover:bg-secondary transition-colors"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(design)}
          className="inline-flex items-center justify-center p-2 rounded-lg border border-border text-xs hover:bg-destructive/10 text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}