import { Toaster } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Links from "./pages/Links";
import LinkDetail from "./pages/LinkDetail";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Analytics from "./pages/Analytics";
import ClickHistory from "./pages/ClickHistory";
import ABTesting from "./pages/ABTesting";
import SmartRedirects from "./pages/SmartRedirects";
import Domains from "./pages/Domains";
import RedirectPage from "./pages/RedirectPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import SsoNexus from "./pages/SsoNexus";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/sso/nexus" element={<SsoNexus />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/:slug" element={<RedirectPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === "pending_approval") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-card p-6 dark:border-amber-800/40">
          <h1 className="text-xl font-semibold tracking-tight">Account Pending Approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is registered but still waiting for admin approval. You can login once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/sso/nexus" element={<SsoNexus />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/links" element={<Links />} />
        <Route path="/links/:id" element={<LinkDetail />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/history" element={<ClickHistory />} />
        <Route path="/ab-testing" element={<ABTesting />} />
        <Route path="/redirects" element={<SmartRedirects />} />
        <Route path="/domains" element={<Domains />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
      <Route path="/:slug" element={<RedirectPage />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
