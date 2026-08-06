import db from "@/api/openClient";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Trees } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LinkTreeContent } from "@/components/linktrees/LinkTreeContent";
import { DEFAULT_THEME, treeSurfaceClasses } from "@/lib/linkTreeTheme";
import { APP_NAME } from "@/lib/settingsConfig";

export default function LinkTreePublicPage() {
  const { slug } = useParams();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await db.linkTrees.getPublic(slug);
        if (!cancelled) setTree(data);
      } catch (err) {
        if (!cancelled) {
          setTree(null);
          setError(err?.status === 404 ? "not_found" : "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!tree?.title) return;
    const previous = document.title;
    document.title = tree.title;
    return () => {
      document.title = previous;
    };
  }, [tree?.title]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-sm w-full text-center space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
            <Trees className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            This link tree is unavailable, paused, or does not exist.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const theme = { ...DEFAULT_THEME, ...(tree.theme || {}) };
  const surface = treeSurfaceClasses(theme);

  return (
    <LinkTreeContent
      title={tree.title}
      bio={tree.bio}
      avatarUrl={tree.avatar_url}
      theme={theme}
      links={tree.links}
      socials={tree.socials}
      className="min-h-screen"
      footer={
        theme.show_branding !== false ? (
          <footer className={cn("py-6 text-center text-xs", surface.subtle)}>
            Powered by {APP_NAME}
          </footer>
        ) : null
      }
    />
  );
}
