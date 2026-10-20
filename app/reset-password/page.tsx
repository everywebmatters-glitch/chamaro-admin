"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthCard, AuthError } from "@/components/auth/AuthCard";
import { ApiError } from "@/lib/api/client";
import { resetPasswordWithToken } from "@/lib/auth/api";

// Same limits as the API (backend MIN_PASSWORD_LENGTH / MAX_PASSWORD_LENGTH).
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
// A link styled as the primary Button (a <button> inside an <a> is invalid HTML).
const PRIMARY_LINK = "inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800";

function readResetToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

function resetErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  if (error.code === "RESET_TOKEN_INVALID") return "This reset link is invalid or has expired. Request a new one.";
  if (error.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return error.message;
}

type Stage = "checking" | "form" | "invalid" | "done";

// Sets a new password from the emailed link: /reset-password/#token=...
export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  // Kept in memory only: never rendered, stored or left in the URL.
  const token = useRef<string | null>(null);
  const started = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The fragment is removed on the first run; a second run (React Strict Mode) must not re-read it.
    if (started.current) return;
    started.current = true;
    token.current = readResetToken(window.location.hash);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    setStage(token.current ? "form" : "invalid");
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password.length > MAX_PASSWORD) return setError(`Use at most ${MAX_PASSWORD} characters.`);
    if (password !== confirm) return setError("The passwords don't match.");
    if (!token.current) return setStage("invalid");

    setIsSubmitting(true);
    setError(null);
    try {
      await resetPasswordWithToken(token.current, password);
      // The link is single-use: forget it once it has worked.
      token.current = null;
      setStage("done");
    } catch (err) {
      setError(resetErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "checking") {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden="true" />
      </div>
    );
  }

  if (stage === "invalid") {
    return (
      <AuthCard title="Link not valid" subtitle="This reset link is incomplete, already used or expired.">
        <Link href="/forgot-password" className={PRIMARY_LINK}>
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  if (stage === "done") {
    return (
      <AuthCard title="Password updated" subtitle="Your admin password has been changed.">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          <Link href="/login" className={PRIMARY_LINK}>
            Sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" subtitle={`Use at least ${MIN_PASSWORD} characters.`}>
      {error && <AuthError message={error} />}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input label="New password" name="password" type="password" autoComplete="new-password" required />
        <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
        <Button type="submit" variant="primary" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
