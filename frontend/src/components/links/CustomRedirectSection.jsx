import { useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import { ChevronDown, Code2, ImagePlus, Timer } from "lucide-react";
import { toast } from "sonner";
import db from "@/api/openClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RedirectLivePreview from "@/components/links/RedirectLivePreview";
import {
  DEFAULT_REDIRECT_HTML,
  MAX_CUSTOM_CODE_LENGTH,
  MAX_REDIRECT_DELAY,
  MIN_REDIRECT_DELAY,
  isRedirectHtmlEmpty,
} from "@/lib/customRedirect";
import "react-quill/dist/quill.snow.css";
import "./custom-redirect.css";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const EDITOR_FORMATS = ["header", "bold", "italic", "underline", "list", "align", "link", "image"];

function insertImage(quill, url) {
  if (!quill || !url) return;
  const range = quill.getSelection(true);
  const index = range ? range.index : Math.max(quill.getLength() - 1, 0);
  quill.insertEmbed(index, "image", url, "user");
  quill.setSelection(index + 1);
}

async function uploadRedirectImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) {
    toast.error("Choose a JPG, PNG, WebP, GIF, or SVG image");
    return "";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error("Image must be 2 MB or smaller");
    return "";
  }
  const result = await db.uploads.logo(file);
  const url = result?.file_url || "";
  if (!url) toast.error("Image upload failed");
  return url;
}

function pickRedirectImage(quill) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = IMAGE_TYPES.join(",");
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const url = await uploadRedirectImage(file);
      if (!url) return;
      insertImage(quill, url);
      toast.success("Image added");
    } catch (error) {
      toast.error(error?.message || "Image upload failed");
    }
  };
  input.click();
}

const EDITOR_MODULES = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link", "image"],
    ],
    handlers: {
      image() {
        pickRedirectImage(this.quill);
      },
    },
  },
};

export default function CustomRedirectSection({
  expanded,
  onExpandedChange,
  enabled,
  html,
  delay,
  buttonLabel,
  countdownText,
  rawHtml,
  css,
  js,
  destinationUrl,
  onChange,
}) {
  const editorRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const hasCustomCode = Boolean(
    String(rawHtml || "").trim() || String(css || "").trim() || String(js || "").trim()
  );
  const summary = enabled
    ? `Custom page, ${delay}s delay${hasCustomCode ? ", custom code" : ""}`
    : "Instant redirect";

  const editorValue = useMemo(() => html || "", [html]);

  function patch(updates) {
    onChange(updates);
  }

  function getQuill() {
    return editorRef.current?.getEditor?.() || null;
  }

  async function handleUploadClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_TYPES.join(",");
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadRedirectImage(file);
        if (!url) return;
        insertImage(getQuill(), url);
        toast.success("Image added");
      } catch (error) {
        toast.error(error?.message || "Image upload failed");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  function handleInsertImageUrl() {
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Image URL must start with http:// or https://");
      return;
    }
    insertImage(getQuill(), url);
    setImageUrl("");
  }

  function handleEnabledChange(nextEnabled) {
    const updates = { custom_redirect_enabled: nextEnabled };
    if (nextEnabled && isRedirectHtmlEmpty(html)) {
      updates.custom_redirect_html = DEFAULT_REDIRECT_HTML;
    }
    patch(updates);
    if (nextEnabled) onExpandedChange(true);
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Custom redirect</p>
            <p className="text-xs text-muted-foreground truncate">{summary}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Show a page before redirect</p>
              <p className="text-xs text-muted-foreground">
                Visitors see your message, then continue to the destination.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
          </div>

          {enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min={MIN_REDIRECT_DELAY}
                    max={MAX_REDIRECT_DELAY}
                    value={delay}
                    onChange={(e) => patch({ custom_redirect_delay: e.target.value })}
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Button label
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={buttonLabel}
                    onChange={(e) => patch({ custom_redirect_button_label: e.target.value })}
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Redirecting text
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={countdownText}
                    onChange={(e) => patch({ custom_redirect_countdown_text: e.target.value })}
                    placeholder="Redirecting..."
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Shown under the large countdown. Use {"{seconds}"} to include the time left.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
                <div className="min-w-0 space-y-4">
                <div className="min-w-0 rounded-xl border border-border bg-card p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Page content</p>
                    <p className="text-xs text-muted-foreground">
                      Message and images shown above the countdown.
                    </p>
                  </div>
                  <div className="custom-redirect-editor">
                    <ReactQuill
                      ref={editorRef}
                      theme="snow"
                      value={editorValue}
                      onChange={(value) => patch({ custom_redirect_html: value })}
                      modules={EDITOR_MODULES}
                      formats={EDITOR_FORMATS}
                      placeholder="Write the message visitors see before they continue"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        disabled={uploading}
                        onClick={handleUploadClick}
                      >
                        <ImagePlus className="h-4 w-4 mr-1.5" />
                        {uploading ? "Uploading…" : "Upload image"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={handleInsertImageUrl}
                      >
                        Insert URL
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <Code2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Custom code</p>
                      <p className="text-xs text-muted-foreground">
                        Runs for every visitor. Target{" "}
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">.custom-redirect-page</code>.
                      </p>
                    </div>
                  </div>
                  <Tabs defaultValue="html">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      <TabsTrigger value="css">CSS</TabsTrigger>
                      <TabsTrigger value="js">JavaScript</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html">
                      <textarea
                        value={rawHtml || ""}
                        maxLength={MAX_CUSTOM_CODE_LENGTH}
                        spellCheck={false}
                        onChange={(e) => patch({ custom_redirect_raw_html: e.target.value })}
                        placeholder={"<h2>Welcome</h2>\n<p>Your markup</p>"}
                        className="w-full min-h-56 px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </TabsContent>
                    <TabsContent value="css">
                      <textarea
                        value={css || ""}
                        maxLength={MAX_CUSTOM_CODE_LENGTH}
                        spellCheck={false}
                        onChange={(e) => patch({ custom_redirect_css: e.target.value })}
                        placeholder={".custom-redirect-page { }"}
                        className="w-full min-h-56 px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </TabsContent>
                    <TabsContent value="js">
                      <textarea
                        value={js || ""}
                        maxLength={MAX_CUSTOM_CODE_LENGTH}
                        spellCheck={false}
                        onChange={(e) => patch({ custom_redirect_js: e.target.value })}
                        placeholder={"document.querySelector('.custom-redirect-page')"}
                        className="w-full min-h-56 px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </TabsContent>
                  </Tabs>
                </div>
                </div>
                <RedirectLivePreview
                  html={html}
                  rawHtml={rawHtml}
                  css={css}
                  js={js}
                  delay={delay}
                  buttonLabel={buttonLabel}
                  countdownText={countdownText}
                  destinationUrl={destinationUrl}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
