import { useRef, useState } from "react";
import { X } from "lucide-react";
import { getShortUrl } from "@/lib/qrcode";
import QRCodePreview from "./QRCodePreview";
import { toast } from "@/components/ui/use-toast";

const STYLES = ["square", "rounded", "dots"];
const SIZES = [200, 300, 400, 600, 800];

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
  const previewRef = useRef(null);

  const shortUrl = getShortUrl(linkSlug, linkDomain);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      size: Number(form.size),
      logo_size: Number(form.logo_size ?? 20),
    });
    setSaving(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{design ? "Edit QR Design" : "Create QR Design"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Design Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Style</label>
              <div className="flex gap-2 mt-1">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, style: s })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${
                      form.style === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Size (px)</label>
              <select
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s} × {s}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Foreground</label>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <input
                    type="color"
                    value={form.fg_color}
                    onChange={(e) => setForm({ ...form, fg_color: e.target.value })}
                    className="h-10 w-10 min-w-10 rounded-lg border border-border cursor-pointer bg-background p-0 appearance-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0"
                  />
                  <input
                    type="text"
                    value={form.fg_color}
                    onChange={(e) => setForm({ ...form, fg_color: e.target.value })}
                    className="w-full min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Background</label>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="h-10 w-10 min-w-10 rounded-lg border border-border cursor-pointer bg-background p-0 appearance-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0"
                  />
                  <input
                    type="text"
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="w-full min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Eye Color</label>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <input
                    type="color"
                    value={form.eye_color}
                    onChange={(e) => setForm({ ...form, eye_color: e.target.value })}
                    className="h-10 w-10 min-w-10 rounded-lg border border-border cursor-pointer bg-background p-0 appearance-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0"
                  />
                  <input
                    type="text"
                    value={form.eye_color}
                    onChange={(e) => setForm({ ...form, eye_color: e.target.value })}
                    className="w-full min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Logo URL (optional)</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {form.logo_url && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Logo Size — <span className="text-foreground">{form.logo_size ?? 20}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={1}
                  value={form.logo_size ?? 20}
                  onChange={(e) => setForm({ ...form, logo_size: Number(e.target.value) })}
                  className="w-full mt-1 accent-primary"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : design ? "Update Design" : "Create Design"}
              </button>
            </div>
          </form>

          {/* Preview */}
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
        </div>
      </div>
    </div>
  );
}