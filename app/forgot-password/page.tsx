"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthCard, AuthError } from "@/components/auth/AuthCard";
import { ApiError } from "@/lib/api/client";
import { requestPasswordResetLink } from "@/lib/auth/api";

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  if (error.status === 400) return "Enter a valid email address.";
  if (error.status === 429) return "Too many requests. Please wait a few minutes and try again.";
  return error.message;
}

// Emails a single-use reset link that opens /reset-password on this app. The API answers the same for every
// email, so the confirmation never says whether an admin account exists.
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await requestPasswordResetLink(email);
      setSent(true);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle="If an admin account exists for that email, we've sent it a password reset link.">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          <p className="text-sm text-zinc-500">The link works once and expires soon. Didn&apos;t get it? Check spam, or try again in a minute.</p>
          <Link href="/login" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password?" subtitle="Enter your admin email and we'll send you a reset link.">
      {error && <AuthError message={error} />}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input label="Email" name="email" type="email" placeholder="Enter your email" autoComplete="email" required />
        <Button type="submit" variant="primary" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
