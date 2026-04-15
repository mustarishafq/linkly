import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

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
    try {
      const res = await forgotPassword(email);
      if (res?.reset_token) {
        setToken(res.reset_token);
      }
      setInfo(res?.message || "Reset request submitted");
    } catch (err) {
      setError(err?.message || "Request failed");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      const res = await resetPassword(token, newPassword);
      setInfo(res?.message || "Password reset successful");
      setNewPassword("");
    } catch (err) {
      setError(err?.message || "Reset failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600">Request a reset token, then set a new password.</p>

        <form onSubmit={handleRequest} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Account email</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full">Request reset token</Button>
        </form>

        <form onSubmit={handleReset} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Reset token</label>
          <Input required value={token} onChange={(e) => setToken(e.target.value)} />
          <label className="block text-sm font-medium text-slate-700">New password</label>
          <Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button type="submit" className="w-full" variant="secondary">Reset password</Button>
        </form>

        {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {info && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}

        <div className="mt-4 text-sm">
          <Link to="/login" className="text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
