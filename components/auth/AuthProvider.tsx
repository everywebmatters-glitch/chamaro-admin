"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { fetchCurrentAdmin, type CurrentAdmin } from "@/lib/auth/api";
import { clearSessionToken, getSessionToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";

interface AdminSession {
  admin: CurrentAdmin;
  logout: () => void;
}

const AdminSessionContext = createContext<AdminSession | null>(null);

export function useAdminSession(): AdminSession {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error("useAdminSession must be used inside <AuthProvider>");
  return session;
}

export function logout() {
  clearSessionToken();
  // Full navigation (not router.replace) so no cached protected page survives in the client router.
  window.location.replace("/login");
}

type State = { status: "checking" } | { status: "authenticated"; admin: CurrentAdmin } | { status: "error"; error: ApiError };

// Gate for every admin page: nothing protected renders until GET /admin/me confirms the session.
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);

  const sendToLogin = useCallback(
    (reason?: "expired" | "forbidden") => {
      clearSessionToken();
      const params = new URLSearchParams({ next: pathname });
      if (reason) params.set("reason", reason);
      router.replace(`/login?${params}`);
    },
    [pathname, router]
  );

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      sendToLogin();
      return;
    }
    const controller = new AbortController();
    fetchCurrentAdmin(token, controller.signal)
      .then((admin) => {
        if (admin.role !== "ADMIN" || !admin.isActive) return sendToLogin("forbidden");
        setState({ status: "authenticated", admin });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Unexpected error while checking your session.");
        if (apiError.status === 401) return sendToLogin("expired");
        if (apiError.status === 403) return sendToLogin("forbidden");
        // Backend down / 5xx / 404: keep the token and let the admin retry instead of logging them out.
        setState({ status: "error", error: apiError });
      });
    return () => controller.abort();
    // Only re-validate on mount and explicit retry, not on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (state.status === "authenticated") {
    return <AdminSessionContext.Provider value={{ admin: state.admin, logout }}>{children}</AdminSessionContext.Provider>;
  }

  if (state.status === "error") {
    const Icon = state.error.isNetworkError ? WifiOff : AlertTriangle;
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <Icon className="h-5 w-5 text-red-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-900">
              {state.error.isNetworkError ? "Admin API unavailable" : "Couldn't verify your session"}
            </p>
            <p className="text-sm text-zinc-500">{state.error.message}</p>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setState({ status: "checking" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
            <Button variant="secondary" onClick={logout}>
              Sign in again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-2 bg-zinc-50">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden="true" />
      <p className="text-sm text-zinc-500">Checking your session...</p>
    </div>
  );
}
