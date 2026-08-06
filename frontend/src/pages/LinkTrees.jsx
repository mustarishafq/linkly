import db from "@/api/openClient";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  GalleryVertical,
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Link2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/layout/PageHeader";
import DashboardWidget from "@/components/dashboard/DashboardWidget";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import FormDialog, { FormDialogBody, FormDialogFooter } from "@/components/ui/form-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  DEFAULT_THEME,
  LINK_TREE_STATUS_FILTERS,
  publicLinkTreeUrl,
  statusBadgeClass,
} from "@/lib/linkTreeTheme";

function LinkTreesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

function CreateTreeDialog({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await db.linkTrees.create({
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        bio: "",
        status: "draft",
        theme: DEFAULT_THEME,
        links: [],
      });
      toast({ title: "Link tree created" });
      onCreated(created);
    } catch (error) {
      toast({
        title: "Could not create link tree",
        description: error?.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialog onClose={onClose} title="New link tree" icon={GalleryVertical} maxWidth="md">
      <form onSubmit={handleSubmit}>
        <FormDialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tree-title">Title</Label>
            <Input
              id="tree-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="My brand links"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tree-slug">Public slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">/t/</span>
              <Input
                id="tree-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="my-brand"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Visitors will open this at /t/{slug || "your-slug"}
            </p>
          </div>
        </FormDialogBody>
        <FormDialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
            {saving ? "Creating…" : "Create"}
          </Button>
        </FormDialogFooter>
      </form>
    </FormDialog>
  );
}

export default function LinkTrees() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { requestConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const rows = await db.linkTrees.list("-created_date", 200);
      setTrees(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast({
        title: "Failed to load link trees",
        description: error?.message,
        variant: "destructive",
      });
      setTrees([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTree(id) {
    await db.linkTrees.delete(id);
    setTrees((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Link tree deleted" });
  }

  function promptDelete(tree) {
    requestConfirm({
      title: "Delete link tree?",
      description: `"${tree.title}" will be deleted permanently. Its public page will stop working.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => deleteTree(tree.id),
    });
  }

  async function copyPublicUrl(tree) {
    const url = publicLinkTreeUrl(tree.slug);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Public URL copied" });
    } catch {
      toast({ title: "Could not copy URL", variant: "destructive" });
    }
  }

  function promptStatusChange(tree, nextStatus) {
    const labels = {
      published: "Publish",
      paused: "Pause",
      draft: "Move to draft",
    };
    requestConfirm({
      title: `${labels[nextStatus] || "Update"} link tree?`,
      description:
        nextStatus === "published"
          ? `"${tree.title}" will be visible at /t/${tree.slug}.`
          : `"${tree.title}" will no longer be publicly visible.`,
      confirmLabel: labels[nextStatus] || "Confirm",
      onConfirm: async () => {
        const updated = await db.linkTrees.update(tree.id, { status: nextStatus });
        setTrees((prev) => prev.map((t) => (t.id === tree.id ? updated : t)));
        toast({ title: `Link tree ${nextStatus}` });
      },
    });
  }

  const filtered = useMemo(() => {
    return trees.filter((tree) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        tree.title?.toLowerCase().includes(q) ||
        tree.slug?.toLowerCase().includes(q) ||
        tree.bio?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || tree.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trees, search, statusFilter]);

  if (loading) {
    return <LinkTreesSkeleton />;
  }

  const publishedCount = trees.filter((t) => t.status === "published").length;
  const totalLinks = trees.reduce((sum, t) => sum + (Array.isArray(t.links) ? t.links.length : 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GalleryVertical}
        title="Link Trees"
        description="Create and customize multi-link public pages"
        action={
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New tree
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={GalleryVertical} label="Your trees" value={trees.length} />
        <StatCard icon={Eye} label="Published" value={publishedCount} />
        <StatCard icon={Link2} label="Total links" value={totalLinks} className="col-span-2 lg:col-span-1" />
      </div>

      <DashboardWidget
        title="All link trees"
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trees…"
                className="pl-8 h-9"
              />
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {LINK_TREE_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                statusFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <GalleryVertical className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">
              {trees.length === 0
                ? "No link trees yet. Create one to share a page of links."
                : "No trees match your filters."}
            </p>
            {trees.length === 0 && (
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first tree
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tree, index) => {
              const linkCount = Array.isArray(tree.links) ? tree.links.length : 0;
              return (
                <motion.div
                  key={tree.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <Link to={`/linktrees/${tree.id}`} className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{tree.title}</p>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium",
                          statusBadgeClass(tree.status)
                        )}
                      >
                        {tree.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      /t/{tree.slug}
                      {user?.role === "admin" && tree.owner_user_id != null
                        ? ` · owner #${tree.owner_user_id}`
                        : ""}
                      {` · ${linkCount} link${linkCount === 1 ? "" : "s"}`}
                    </p>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/linktrees/${tree.id}`)}>
                        <Edit className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyPublicUrl(tree)}>
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Copy public URL
                      </DropdownMenuItem>
                      {tree.status === "published" && (
                        <DropdownMenuItem asChild>
                          <a href={`/t/${tree.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Open public page
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {tree.status !== "published" && (
                        <DropdownMenuItem onClick={() => promptStatusChange(tree, "published")}>
                          Publish
                        </DropdownMenuItem>
                      )}
                      {tree.status === "published" && (
                        <DropdownMenuItem onClick={() => promptStatusChange(tree, "paused")}>
                          Pause
                        </DropdownMenuItem>
                      )}
                      {tree.status !== "draft" && (
                        <DropdownMenuItem onClick={() => promptStatusChange(tree, "draft")}>
                          Move to draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => promptDelete(tree)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              );
            })}
          </div>
        )}
      </DashboardWidget>

      {showForm && (
        <CreateTreeDialog
          onClose={() => setShowForm(false)}
          onCreated={(created) => {
            setShowForm(false);
            navigate(`/linktrees/${created.id}`);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
