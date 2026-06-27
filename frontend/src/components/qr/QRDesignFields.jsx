import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import db from "@/api/openClient";
import QRCodePreview from "./QRCodePreview";
import { QR_SIZES, QR_STYLES } from "@/lib/qrDesignConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_BASE_URL = (/** @type {any} */ (import.meta).env?.VITE_API_BASE_URL) || "/api";
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

function getLogoPreviewSrc(url) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(parsed.href)}`;
    }
  } catch {
    return url;
  }

  return url;
}

export default function QRDesignFields({ form, setForm, previewUrl, previewSize = 120 }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG, WebP, GIF, or SVG image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be 2 MB or smaller");
      return;
    }

    setUploading(true);
    try {
      const result = await db.uploads.logo(file);
      setForm({ ...form, logo_url: result?.file_url || "" });
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err?.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearLogo = () => {
    setForm({ ...form, logo_url: "" });
  };

  return (
    <div className="space-y-4">
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
          {QR_STYLES.map((s) => (
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
          {QR_SIZES.map((s) => (
            <option key={s} value={s}>{s} × {s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "fg_color", label: "Foreground" },
          { key: "bg_color", label: "Background" },
          { key: "eye_color", label: "Eye Color" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <div className="mt-1 flex items-center gap-2 min-w-0">
              <input
                type="color"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="h-10 w-10 min-w-10 rounded-lg border border-border cursor-pointer bg-background p-0 appearance-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0"
              />
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-xs font-mono"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Logo (optional)</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a URL or upload an image for the center of your QR code.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="url"
            placeholder="https://example.com/logo.png"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            className="text-sm"
          />
          <div className="flex gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_LOGO_TYPES.join(",")}
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-1.5" />
                  Upload
                </>
              )}
            </Button>
            {form.logo_url && (
              <Button type="button" variant="ghost" size="icon" onClick={clearLogo} aria-label="Remove logo">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {form.logo_url && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="h-10 w-10 rounded-md border border-border bg-background overflow-hidden shrink-0">
              <img
                src={getLogoPreviewSrc(form.logo_url)}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground truncate">{form.logo_url}</p>
          </div>
        )}
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

      {previewUrl && (
        <div className="flex items-center gap-4 pt-2">
          <div
            className="rounded-lg border border-border p-2 shrink-0"
            style={{ background: form.bg_color }}
          >
            <QRCodePreview
              value={previewUrl}
              design={form}
              size={Number(form.size) || 300}
              displaySize={previewSize}
            />
          </div>
          <p className="text-xs text-muted-foreground">Preview updates as you change settings</p>
        </div>
      )}
    </div>
  );
}
