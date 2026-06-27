import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNavigationFallback } from "@/lib/navigationFallbacks";

export function canNavigateBack() {
  return typeof window !== "undefined" && (window.history.state?.idx ?? 0) > 0;
}

export function useGoBack(explicitFallback) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return useCallback(() => {
    const fallback = explicitFallback ?? getNavigationFallback(pathname);

    if (canNavigateBack()) {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  }, [navigate, pathname, explicitFallback]);
}
