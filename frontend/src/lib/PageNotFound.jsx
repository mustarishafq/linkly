import { useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import db from "@/api/openClient";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const user = await db.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
      <p className="text-7xl font-light text-muted-foreground/40">404</p>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        The page &quot;{pageName}&quot; could not be found in this application.
      </p>

      {isFetched && authData.isAuthenticated && authData.user?.role === "admin" && (
        <div className="mt-4 max-w-sm rounded-2xl border border-border bg-card p-4 text-left">
          <p className="text-sm font-medium">Admin note</p>
          <p className="text-sm text-muted-foreground mt-1">
            This page may not be implemented yet.
          </p>
        </div>
      )}

      <Button asChild className="mt-2">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
