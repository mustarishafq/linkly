import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  AuthBrandPanel,
  AuthFormPanel,
  AuthShell,
  authInputClass,
  authSubmitClass,
} from "@/components/auth/AuthLayout";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setRequestLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res?.reset_token) {
        setToken(res.reset_token);
      }
      setInfo(res?.message || "Reset request submitted");
    } catch (err) {
      setError(err?.message || "Request failed");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setResetLoading(true);
    try {
      const res = await resetPassword(token, newPassword);
      setInfo(res?.message || "Password reset successful");
      setNewPassword("");
    } catch (err) {
      setError(err?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthBrandPanel
        title={<>Forgot your<br />password?</>}
        description="Enter your email and we'll send you a reset token to get back in."
        chips={["Secure reset", "Token-based", "Fast recovery"]}
      />

      <AuthFormPanel>
        <div className="space-y-2 lg:space-y-0 text-center lg:text-left">
          <h1 className="text-3xl lg:text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Request a token, then set your new password below.
          </p>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <p className="text-sm font-semibold">Request a reset token</p>
            </div>
            <form onSubmit={handleRequest} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-sm font-medium">
                  Account email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={authInputClass}
                />
              </div>
              <Button type="submit" className={authSubmitClass} disabled={requestLoading}>
                {requestLoading ? "Sending…" : "Send reset token"}
              </Button>
            </form>
          </Card>

          <Card className="rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                2
              </span>
              <p className="text-sm font-semibold">Set your new password</p>
            </div>
            <form onSubmit={handleReset} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-token" className="text-sm font-medium">
                  Reset token
                </Label>
                <Input
                  id="reset-token"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token here"
                  className={`${authInputClass} font-mono text-sm`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={authInputClass}
                />
              </div>
              <Button type="submit" variant="secondary" className={authSubmitClass} disabled={resetLoading}>
                {resetLoading ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          </Card>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 px-4 py-3 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{info}</p>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </AuthFormPanel>
    </AuthShell>
  );
}
