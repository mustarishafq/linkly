import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getNexusBrainLoginUrl } from "@/lib/nexusBrain";
import { APP_NAME } from "@/lib/settingsConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthBrandPanel,
  AuthFormPanel,
  AuthShell,
  authInputClass,
  authSubmitClass,
} from "@/components/auth/AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next = new URLSearchParams(location.search).get("next") || "/";

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ email, password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  const pendingApproval = authError?.type === "pending_approval";

  return (
    <AuthShell>
      <AuthBrandPanel
        title={<>Shorten, share &<br />track your links</>}
        description="Powerful link management with real-time analytics, QR codes, and smart redirects — all in one place."
        chips={["Analytics", "QR codes", "Smart redirects"]}
      />

      <AuthFormPanel>
        <div className="space-y-2 lg:space-y-0 text-center lg:text-left">
          <h1 className="text-3xl lg:text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your {APP_NAME} account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2 lg:space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={authInputClass}
            />
          </div>

          <div className="space-y-2 lg:space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={authInputClass}
            />
          </div>

          {(error || pendingApproval) && (
            <div
              className={
                pendingApproval
                  ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/20 flex items-start gap-2.5"
                  : "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2.5"
              }
            >
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  pendingApproval
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-destructive"
                }`}
              />
              <p
                className={`text-sm ${
                  pendingApproval
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-destructive"
                }`}
              >
                {pendingApproval ? "Your account is pending admin approval." : error}
              </p>
            </div>
          )}

          <Button className={authSubmitClass} type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 rounded-xl font-medium"
          onClick={() => { window.location.href = getNexusBrainLoginUrl(); }}
        >
          Continue with EMZI Nexus Brain
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:text-primary/80 transition-colors">
            Create one
          </Link>
        </p>
      </AuthFormPanel>
    </AuthShell>
  );
}
