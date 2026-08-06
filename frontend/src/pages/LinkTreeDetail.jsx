import db from "@/api/openClient";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  Trash2,
  GripVertical,
  Copy,
  ExternalLink,
  Upload,
  Save,
  Eye,
  Pause,
  UserRound,
  Palette,
  LayoutList,
  Link2,
  BarChart3,
  MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BackButton from "@/components/ui/BackButton";
import { useGoBack } from "@/hooks/useGoBack";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinkTreeContent } from "@/components/linktrees/LinkTreeContent";
import { summarizeLinkTreeClicks } from "@/lib/linkTreeAnalytics";
import StatCard from "@/components/ui/StatCard";
import {
  AVATAR_SHAPES,
  BACKGROUND_PRESETS,
  BUTTON_RADII,
  BUTTON_STYLES,
  DEFAULT_THEME,
  FONT_STYLES,
  LINK_BLOCK_TYPES,
  SOCIAL_PLATFORMS,
  getAvatarShapeClass,
  getBlockType,
  isDarkTheme,
  newLinkItem,
  normalizeHttpUrl,
  publicLinkTreeUrl,
  statusBadgeClass,
} from "@/lib/linkTreeTheme";

const EDITOR_TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "design", label: "Design", icon: Palette },
  { id: "blocks", label: "Blocks", icon: LayoutList },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <Skeleton className="h-[560px] rounded-2xl" />
        <Skeleton className="h-[560px] rounded-2xl" />
      </div>
    </div>
  );
}

function SegmentedControl({ options, value, onChange, className }) {
  return (
    <div
      className={cn(
        "inline-flex w-full sm:w-auto flex-wrap sm:flex-nowrap rounded-xl bg-muted/70 p-1 gap-0.5",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            value === opt.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
      ) : null}
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LivePreview({ title, bio, avatarUrl, theme, links, socials }) {
  const treeDark = isDarkTheme(theme);

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "relative w-[260px] sm:w-[280px] shrink-0",
          /* Device bezel stays dark in both app themes */
          "rounded-[2.2rem] border-[9px] border-zinc-900 bg-zinc-900",
          "shadow-2xl shadow-black/20 dark:shadow-black/50"
        )}
      >
        <div className="absolute -left-[12px] top-20 h-7 w-[2.5px] rounded-l-sm bg-zinc-800" aria-hidden />
        <div className="absolute -left-[12px] top-32 h-10 w-[2.5px] rounded-l-sm bg-zinc-800" aria-hidden />
        <div className="absolute -left-[12px] top-44 h-10 w-[2.5px] rounded-l-sm bg-zinc-800" aria-hidden />
        <div className="absolute -right-[12px] top-36 h-14 w-[2.5px] rounded-r-sm bg-zinc-800" aria-hidden />

        <div className="relative overflow-hidden rounded-[1.65rem] h-[520px] sm:h-[560px] bg-zinc-950">
          <div className="absolute inset-0 overflow-y-auto">
            <LinkTreeContent
              title={title}
              bio={bio}
              avatarUrl={avatarUrl}
              theme={theme}
              links={links}
              socials={socials}
              compact
              className="min-h-full pt-9"
            />
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-2.5 text-[10px] font-semibold",
              treeDark ? "text-white/75" : "text-slate-800/70"
            )}
          >
            <span className="tabular-nums w-8">9:41</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-2 h-[20px] w-[84px] rounded-full bg-zinc-950" />
            <span className="w-8 text-right opacity-70">▌▌</span>
          </div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-zinc-950/40 z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

function BlockFields({ link, updateLink }) {
  const type = link.type || "link";

  if (type === "divider") {
    return <p className="text-xs text-muted-foreground px-0.5">Visual separator — no fields.</p>;
  }

  if (type === "header") {
    return (
      <Input
        value={link.title}
        onChange={(e) => updateLink(link.id, { title: e.target.value })}
        placeholder="Section header"
      />
    );
  }

  if (type === "text") {
    return (
      <Textarea
        value={link.title}
        onChange={(e) => updateLink(link.id, { title: e.target.value })}
        placeholder="Write a short paragraph…"
        rows={3}
      />
    );
  }

  if (type === "image") {
    return (
      <div className="space-y-2">
        <Input
          value={link.image_url || link.url || ""}
          onChange={(e) => updateLink(link.id, { image_url: e.target.value })}
          placeholder="Image URL"
        />
        <Input
          value={link.title || ""}
          onChange={(e) => updateLink(link.id, { title: e.target.value })}
          placeholder="Caption (optional)"
        />
        <Input
          value={link.url || ""}
          onChange={(e) => updateLink(link.id, { url: e.target.value })}
          placeholder="Optional click-through URL"
        />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="space-y-2">
        <Input
          value={link.title || ""}
          onChange={(e) => updateLink(link.id, { title: e.target.value })}
          placeholder="Title (optional)"
        />
        <Input
          value={link.url || ""}
          onChange={(e) => updateLink(link.id, { url: e.target.value })}
          placeholder="YouTube or Vimeo URL"
        />
      </div>
    );
  }

  if (type === "music") {
    return (
      <div className="space-y-2">
        <Input
          value={link.title || ""}
          onChange={(e) => updateLink(link.id, { title: e.target.value })}
          placeholder="Track / playlist title"
        />
        <Input
          value={link.url || ""}
          onChange={(e) => updateLink(link.id, { url: e.target.value })}
          placeholder="Spotify or music URL"
        />
      </div>
    );
  }

  if (type === "email" || type === "phone") {
    return (
      <div className="space-y-2">
        <Input
          value={link.title || ""}
          onChange={(e) => updateLink(link.id, { title: e.target.value })}
          placeholder="Button label"
        />
        <Input
          value={link.url || ""}
          onChange={(e) => updateLink(link.id, { url: e.target.value })}
          placeholder={type === "email" ? "you@example.com" : "+60 12-345 6789"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        value={link.title || ""}
        onChange={(e) => updateLink(link.id, { title: e.target.value })}
        placeholder="Link title"
      />
      <Input
        value={link.url || ""}
        onChange={(e) => updateLink(link.id, { url: e.target.value })}
        placeholder="https://example.com"
      />
    </div>
  );
}

export default function LinkTreeDetail() {
  const { id } = useParams();
  const goBack = useGoBack("/linktrees");
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("profile");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [links, setLinks] = useState([]);
  const [socials, setSocials] = useState([]);
  const [stats, setStats] = useState({ views: 0, clicks: 0, uniqueDevices: 0, byBlock: [] });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const tree = await db.linkTrees.get(id);
        if (cancelled) return;
        if (!tree?.id) {
          setNotFound(true);
          return;
        }
        setTitle(tree.title || "");
        setSlug(tree.slug || "");
        setBio(tree.bio || "");
        setAvatarUrl(tree.avatar_url || "");
        setStatus(tree.status || "draft");
        setTheme({ ...DEFAULT_THEME, ...(tree.theme || {}) });
        setLinks(
          (Array.isArray(tree.links) ? tree.links : []).map((l) => ({
            type: "link",
            description: "",
            image_url: "",
            clicks: 0,
            ...l,
          }))
        );
        setSocials(Array.isArray(tree.socials) ? tree.socials : []);
        setStats({
          views: tree.total_views || 0,
          clicks: tree.total_clicks || 0,
          uniqueDevices: 0,
          byBlock: [],
        });
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (tab !== "analytics" || !id) return;
    let cancelled = false;
    async function loadStats() {
      setStatsLoading(true);
      try {
        const treeId = Number(id);
        const [byNumber, byString] = await Promise.all([
          db.entities.ClickLog.filter({ link_tree_id: treeId }, "-created_date", 1000),
          db.entities.ClickLog.filter({ link_tree_id: String(id) }, "-created_date", 1000),
        ]);
        const merged = [...byNumber, ...byString];
        const unique = [];
        const seen = new Set();
        for (const row of merged) {
          const key = row.id ?? `${row.timestamp}-${row.event}-${row.block_id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(row);
        }
        if (!cancelled) setStats(summarizeLinkTreeClicks(unique));
      } catch {
        if (!cancelled) {
          /* keep counter snapshot from tree payload */
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [tab, id]);

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function updateLink(linkId, patch) {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...patch } : l)));
  }

  function removeLink(linkId) {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  function addBlock(type = "link") {
    setLinks((prev) => [...prev, newLinkItem({ type, sort_order: prev.length })]);
    setTab("blocks");
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const next = Array.from(links);
    const [removed] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, removed);
    setLinks(next.map((l, i) => ({ ...l, sort_order: i })));
  }

  function updateSocial(platform, url) {
    setSocials((prev) => {
      const trimmed = url.trim();
      const without = prev.filter((s) => s.platform !== platform);
      if (!trimmed) return without;
      return [...without, { platform, url: trimmed }];
    });
  }

  function socialUrl(platform) {
    return socials.find((s) => s.platform === platform)?.url || "";
  }

  function socialsForSave() {
    return socials
      .map((s) => ({
        platform: s.platform,
        url: normalizeHttpUrl(s.url),
      }))
      .filter((s) => s.platform && s.url);
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await db.uploads.logo(file);
      setAvatarUrl(result?.file_url || "");
      toast({ title: "Avatar uploaded" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save(nextStatus = status) {
    setSaving(true);
    try {
      const updated = await db.linkTrees.update(id, {
        title: title.trim(),
        slug: slugify(slug),
        bio: bio.trim(),
        avatar_url: avatarUrl || null,
        status: nextStatus,
        theme,
        socials: socialsForSave(),
        links: links.map((l, i) => ({
          ...l,
          type: l.type || "link",
          sort_order: i,
          title: l.title?.trim() || "",
          url: ["email", "phone"].includes(l.type)
            ? l.url?.trim() || ""
            : normalizeHttpUrl(l.url) || l.url?.trim() || "",
          description: l.description?.trim() || "",
          image_url: normalizeHttpUrl(l.image_url) || l.image_url?.trim() || "",
        })),
      });
      setStatus(updated.status);
      setSlug(updated.slug);
      setLinks(Array.isArray(updated.links) ? updated.links : []);
      setSocials(Array.isArray(updated.socials) ? updated.socials : []);
      setTheme({ ...DEFAULT_THEME, ...(updated.theme || {}) });
      toast({ title: "Link tree saved" });
      return updated;
    } catch (error) {
      toast({
        title: "Could not save",
        description: error?.message || "Check your fields and try again",
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  }

  function promptPublish() {
    requestConfirm({
      title: "Publish link tree?",
      description: `"${title}" will be visible at /t/${slugify(slug)}.`,
      confirmLabel: "Publish",
      onConfirm: () => save("published"),
    });
  }

  function promptPause() {
    requestConfirm({
      title: "Pause link tree?",
      description: "The public page will stop being visible until you publish again.",
      confirmLabel: "Pause",
      onConfirm: () => save("paused"),
    });
  }

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicLinkTreeUrl(slugify(slug)));
      toast({ title: "Public URL copied" });
    } catch {
      toast({ title: "Could not copy URL", variant: "destructive" });
    }
  }

  if (loading) return <EditorSkeleton />;

  if (notFound) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-lg font-medium">Link tree not found</p>
        <Button variant="link" onClick={goBack}>
          ← Back to link trees
        </Button>
      </div>
    );
  }

  const enabledCount = links.filter((l) => l.enabled).length;

  return (
    <div className="space-y-4 pb-20 xl:pb-0">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton fallback="/linktrees" label="Back" />
            <Avatar className={cn("h-11 w-11 shrink-0 border border-border", getAvatarShapeClass(theme.avatar_shape))}>
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={title} className={getAvatarShapeClass(theme.avatar_shape)} />
              ) : null}
              <AvatarFallback className={getAvatarShapeClass(theme.avatar_shape)}>
                {(title || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-semibold truncate">{title || "Untitled tree"}</h1>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium",
                    statusBadgeClass(status)
                  )}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                <Link2 className="h-3 w-3 shrink-0" />
                /t/{slug || "…"}
                <span className="text-border">·</span>
                {enabledCount} block{enabledCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-11 lg:pl-0">
            <Button type="button" variant="ghost" size="sm" onClick={copyPublicUrl} className="gap-1.5 h-9">
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            {status === "published" && (
              <Button type="button" variant="ghost" size="sm" asChild className="gap-1.5 h-9">
                <a href={`/t/${slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
              </Button>
            )}
            {status !== "published" ? (
              <Button type="button" variant="outline" size="sm" onClick={promptPublish} disabled={saving} className="gap-1.5 h-9">
                <Eye className="h-3.5 w-3.5" />
                Publish
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={promptPause} disabled={saving} className="gap-1.5 h-9">
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => save()} disabled={saving} className="gap-1.5 h-9 min-w-[88px]">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] gap-4 items-start">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card overflow-hidden min-w-0"
        >
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col">
            <div className="border-b border-border px-3 sm:px-4 pt-3 pb-0">
              <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0 rounded-none">
                {EDITOR_TABS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className={cn(
                        "relative gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 shadow-none",
                        "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        "text-muted-foreground data-[state=active]:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                      {item.id === "blocks" && links.length > 0 ? (
                        <span className="ml-0.5 text-[10px] rounded-full bg-secondary px-1.5 py-0.5 tabular-nums">
                          {links.length}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <TabsContent value="profile" className="mt-0 p-4 sm:p-5 space-y-6 focus-visible:outline-none">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex flex-col items-center sm:items-start gap-3 shrink-0">
                  <Avatar className={cn("h-20 w-20 border border-border shadow-sm", getAvatarShapeClass(theme.avatar_shape))}>
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={title} className={getAvatarShapeClass(theme.avatar_shape)} />
                    ) : null}
                    <AvatarFallback className={cn("text-xl", getAvatarShapeClass(theme.avatar_shape))}>
                      {(title || "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center sm:items-start gap-1">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                        <Upload className="h-3 w-3" />
                        {uploading ? "Uploading…" : "Change photo"}
                      </span>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                    {avatarUrl ? (
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => setAvatarUrl("")}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 space-y-3.5 min-w-0">
                  <Field label="Title" htmlFor="title">
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your name or brand" />
                  </Field>
                  <Field label="Public URL" htmlFor="slug" hint="Visitors open this at /t/your-slug">
                    <div className="flex items-center gap-0 rounded-lg border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                      <span className="px-3 text-xs text-muted-foreground bg-muted/50 border-r border-input h-9 flex items-center shrink-0">
                        /t/
                      </span>
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                        className="border-0 rounded-none focus-visible:ring-0 shadow-none"
                        placeholder="your-slug"
                      />
                    </div>
                  </Field>
                  <Field label="Bio" htmlFor="bio">
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="A short line about you or your brand"
                    />
                  </Field>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Social icons</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Shown under your bio. Empty fields stay hidden.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <Field key={platform.id} label={platform.label}>
                      <Input
                        value={socialUrl(platform.id)}
                        onChange={(e) => updateSocial(platform.id, e.target.value)}
                        placeholder={platform.placeholder}
                        className="h-9"
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="mt-0 p-4 sm:p-5 space-y-6 focus-visible:outline-none">
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">Background</h3>
                <div className="grid grid-cols-5 gap-2">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.label}
                      onClick={() => setTheme((t) => ({ ...t, background_preset: preset.id }))}
                      className={cn(
                        "relative h-14 rounded-xl border overflow-hidden transition-all",
                        preset.className,
                        theme.background_preset === preset.id
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-card border-transparent"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <span className="absolute inset-x-0 bottom-0 py-0.5 text-[9px] font-medium text-center bg-black/35 text-white dark:bg-black/50">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">Accent</h3>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={theme.accent_color || DEFAULT_THEME.accent_color}
                    onChange={(e) => setTheme((t) => ({ ...t, accent_color: e.target.value }))}
                    className="w-12 h-12 p-1 cursor-pointer rounded-xl"
                    aria-label="Accent color"
                  />
                  <Input
                    value={theme.accent_color || DEFAULT_THEME.accent_color}
                    onChange={(e) => setTheme((t) => ({ ...t, accent_color: e.target.value }))}
                    className="font-mono text-sm max-w-[140px]"
                  />
                  <div
                    className="hidden sm:block h-9 flex-1 rounded-lg border border-border"
                    style={{ backgroundColor: theme.accent_color || DEFAULT_THEME.accent_color }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Button style</h3>
                  <SegmentedControl
                    options={BUTTON_STYLES}
                    value={theme.button_style}
                    onChange={(id) => setTheme((t) => ({ ...t, button_style: id }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Button shape</h3>
                  <SegmentedControl
                    options={BUTTON_RADII}
                    value={theme.button_radius}
                    onChange={(id) => setTheme((t) => ({ ...t, button_radius: id }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Font</h3>
                  <SegmentedControl
                    options={FONT_STYLES}
                    value={theme.font_style}
                    onChange={(id) => setTheme((t) => ({ ...t, font_style: id }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Avatar shape</h3>
                  <SegmentedControl
                    options={AVATAR_SHAPES}
                    value={theme.avatar_shape}
                    onChange={(id) => setTheme((t) => ({ ...t, avatar_shape: id }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Branding footer</p>
                  <p className="text-xs text-muted-foreground">Show “Powered by” on the public page</p>
                </div>
                <Switch
                  checked={theme.show_branding !== false}
                  onCheckedChange={(checked) => setTheme((t) => ({ ...t, show_branding: checked }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="blocks" className="mt-0 p-4 sm:p-5 space-y-4 focus-visible:outline-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Page blocks</h3>
                  <p className="text-xs text-muted-foreground">Drag to reorder. Toggle off to hide.</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {LINK_BLOCK_TYPES.map((type) => (
                      <DropdownMenuItem key={type.id} onClick={() => addBlock(type.id)}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-[11px] text-muted-foreground">{type.description}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {links.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-12 px-4 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <LayoutList className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No blocks yet. Add links, videos, or headers.
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={() => addBlock("link")} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add first link
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="link-tree-links">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2.5">
                        {links.map((link, index) => {
                          const meta = getBlockType(link.type || "link");
                          return (
                            <Draggable key={link.id} draggableId={String(link.id)} index={index}>
                              {(dragProvided, snapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={cn(
                                    "rounded-xl border border-border bg-background/80 p-3 space-y-2.5 transition-shadow",
                                    snapshot.isDragging && "shadow-lg ring-2 ring-primary/20",
                                    !link.enabled && "opacity-55"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="p-1 text-muted-foreground cursor-grab active:cursor-grabbing rounded-md hover:bg-secondary"
                                      {...dragProvided.dragHandleProps}
                                      aria-label="Reorder"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </button>
                                    <span className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 px-2 py-0.5 rounded-md bg-primary/10">
                                      {meta.label}
                                    </span>
                                    {(link.clicks || 0) > 0 ? (
                                      <span className="text-[10px] text-muted-foreground tabular-nums">
                                        {link.clicks} clicks
                                      </span>
                                    ) : null}
                                    <div className="flex-1" />
                                    <Switch
                                      id={`enabled-${link.id}`}
                                      checked={Boolean(link.enabled)}
                                      onCheckedChange={(checked) => updateLink(link.id, { enabled: checked })}
                                      aria-label="Enabled"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeLink(link.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <BlockFields link={link} updateLink={updateLink} />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 p-4 sm:p-5 space-y-5 focus-visible:outline-none">
              <div>
                <h3 className="text-sm font-semibold">Performance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Page views and block clicks from your public Link Tree
                </p>
              </div>

              {statsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-[88px] rounded-2xl" />
                  <Skeleton className="h-[88px] rounded-2xl" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Eye} label="Page views" value={stats.views} accent="info" />
                  <StatCard icon={MousePointerClick} label="Block clicks" value={stats.clicks} accent="primary" />
                </div>
              )}

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Clicks by block
                  </p>
                </div>
                {statsLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : stats.byBlock.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10 px-4">
                    No block clicks yet. Share your published page to start collecting data.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {stats.byBlock.map((row) => {
                      const max = Math.max(...stats.byBlock.map((b) => b.clicks), 1);
                      const pct = Math.round((row.clicks / max) * 100);
                      return (
                        <li key={row.block_id || row.block_title} className="px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{row.block_title}</p>
                              <p className="text-[11px] text-muted-foreground capitalize">{row.block_type}</p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums shrink-0">{row.clicks}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Counters update when visitors open /t/{slug || "…"} and tap blocks. Preview mode is excluded.
              </p>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Preview stage */}
        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:sticky xl:top-4 space-y-3"
        >
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div>
                <p className="text-sm font-semibold">Preview</p>
                <p className="text-[11px] text-muted-foreground">Updates as you edit</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                Mobile
              </span>
            </div>
            <div
              className={cn(
                "px-4 py-6 sm:py-8",
                "bg-muted/40 dark:bg-muted/20"
              )}
            >
              <LivePreview
                title={title}
                bio={bio}
                avatarUrl={avatarUrl}
                theme={theme}
                links={links}
                socials={socials}
              />
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/30 dark:bg-muted/20 text-center">
              {status === "published" ? (
                <a
                  href={`/t/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Live at /t/{slug}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Publish to share this page</p>
              )}
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Mobile sticky save */}
      <div className="xl:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-3 z-40">
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg p-2 flex gap-2">
          {status !== "published" ? (
            <Button type="button" variant="outline" className="flex-1" onClick={promptPublish} disabled={saving}>
              Publish
            </Button>
          ) : (
            <Button type="button" variant="outline" className="flex-1" onClick={promptPause} disabled={saving}>
              Pause
            </Button>
          )}
          <Button type="button" className="flex-1 gap-1.5" onClick={() => save()} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {confirmDialog}
    </div>
  );
}
