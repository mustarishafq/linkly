import { useEffect, useState } from "react";
import { QrCode, RefreshCw } from "lucide-react";
import db from "@/api/openClient";
import { DEFAULT_QR_DESIGN, normalizeQrDesign } from "@/lib/qrDesignConfig";
import QRDesignFields from "@/components/qr/QRDesignFields";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SAMPLE_PREVIEW_URL = "https://linkly.example/demo";

export default function QrDefaultSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...DEFAULT_QR_DESIGN });

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await db.settings.get();
      setForm(normalizeQrDesign(data?.qr_default || DEFAULT_QR_DESIGN));
    } catch (err) {
      setError(err?.message || "Failed to load QR default settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await db.settings.update({
        qr_default: {
          ...form,
          size: Number(form.size),
          logo_size: Number(form.logo_size ?? 20),
        },
      });
      toast.success("Default QR design saved");
      await loadSettings();
    } catch (err) {
      setError(err?.message || "Failed to save QR default settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading QR default settings…</p>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Default QR Design
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Applied automatically when users create new links. Existing links keep their saved design.
        </p>
      </div>

      <QRDesignFields
        form={form}
        setForm={setForm}
        previewUrl={SAMPLE_PREVIEW_URL}
        previewSize={96}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          "Save QR Default"
        )}
      </Button>
    </div>
  );
}
