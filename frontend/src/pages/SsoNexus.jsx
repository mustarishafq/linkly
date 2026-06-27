import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import db from "@/api/openClient";
import { sanitizeClientRedirect, storeSsoReturnTo } from "@/lib/ssoRedirect";
import { APP_NAME } from "@/lib/settingsConfig";
import { Button } from "@/components/ui/button";

export default function SsoNexus() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Verifying your Nexus session…");

  useEffect(() => {
    const token = searchParams.get("token");
    const redirectTo = searchParams.get("redirect_to");
    const returnTo = searchParams.get("return_to");

    if (!token) {
      setError(`Missing SSO token. Please launch ${APP_NAME} from EMZI Nexus Brain.`);
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        setStatus("Signing you in…");
        const result = await db.auth.verifyNexusSso(token, {
          redirect_to: redirectTo || undefined,
          return_to: returnTo || undefined,
        });

        if (cancelled) return;

        if (result?.return_to) {
          storeSsoReturnTo(result.return_to);
        }

        const destination = sanitizeClientRedirect(result?.redirect_to || redirectTo || "/");
        window.location.assign(destination);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "SSO verification failed");
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SSO sign-in failed</h1>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => { window.location.assign("/login"); }}>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
