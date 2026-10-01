"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, Store } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { loginAdmin } from "@/lib/auth/api";
import { getSessionToken, safeRedirectPath, setSessionToken } from "@/lib/auth/session";

// Set by AuthProvider when it sends someone back here.
const REASON_MESSAGES: Record<string, string> = {
  expired: "Your session has expired. Please sign in again.",
  forbidden: "This account doesn't have admin access or is inactive.",
};

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  // The API rejects malformed email/password with 400 VALIDATION_ERROR before checking credentials.
  if (error.status === 400) return "Invalid email or password";
  if (error.status === 429) return "Too many sign-in attempts. Please wait a minute and try again.";
  return error.message;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(REASON_MESSAGES[searchParams.get("reason") ?? ""] ?? null);

  // Already signed in: skip the form. AuthProvider clears the cookie before sending anyone here,
  // so a rejected token can't bounce back and forth.
  useEffect(() => {
    if (getSessionToken()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const { token } = await loginAdmin(email, password);
      setSessionToken(token);
      router.replace(safeRedirectPath(searchParams.get("next")));
    } catch (err) {
      setError(loginErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900 text-white">
            <Store className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight text-zinc-900">CHAMARO</p>
            <p className="text-xs text-zinc-400">Admin Panel</p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in to manage your store.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <Button type="submit" variant="primary" className="mt-1 w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <a href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
