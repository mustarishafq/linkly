import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
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
import { APP_NAME } from "@/lib/settingsConfig";

export default function Register() {
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await register({ full_name: fullName, email, password });
      setSuccess(result?.message || "Registration submitted for admin approval.");
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err?.message || "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthBrandPanel
        title={<>Start managing<br />your links today</>}
        description={`Join marketers, developers, and creators who use ${APP_NAME} to grow their reach.`}
        chips={["Custom domains", "Real-time analytics", "A/B testing"]}
      />

      <AuthFormPanel>
        <div className="space-y-2 lg:space-y-0 text-center lg:text-left">
          <h1 className="text-3xl lg:text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            New accounts require admin approval before login.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 p-5 text-center space-y-3">
            <div className="flex justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{success}</p>
            <Link
              to="/login"
              className="block text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2 lg:space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Full name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Jane Smith"
                className={authInputClass}
              />
            </div>

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
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className={authInputClass}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2.5">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button className={authSubmitClass} type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        )}

        {!success && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </AuthFormPanel>
    </AuthShell>
  );
}
