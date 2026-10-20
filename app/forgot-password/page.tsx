"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthCard, AuthError } from "@/components/auth/AuthCard";
import { ApiError } from "@/lib/api/client";
import { resetPasswordWithCode, sendPasswordResetCode, verifyPasswordResetCode } from "@/lib/auth/api";

// Same limits as the API (backend MIN_PASSWORD_LENGTH / MAX_PASSWORD_LENGTH).
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const CODE_PATTERN = /^[0-9]{6}$/;
const PRIMARY_LINK = "inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800";

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  switch (error.code) {
    case "OTP_INVALID":
      return "That code is incorrect. Check the email and try again.";
    case "OTP_EXPIRED":
      return "This code has expired. Send a new one.";
    case "OTP_MAX_ATTEMPTS":
      return "Too many incorrect attempts. Send a new code.";
    case "OTP_RESEND_COOLDOWN":
      return "A code was sent recently. Please wait a minute before sending another.";
  }
  if (error.status === 400) return "Check what you entered and try again.";
  if (error.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return error.message;
}

type Step = "email" | "code" | "password" | "done";

const SUBTITLES: Record<Step, string> = {
  email: "Enter your admin email and we'll send you a 6-digit verification code.",
  code: "",
  password: `Choose a new password of at least ${MIN_PASSWORD} characters.`,
  done: "Your admin password has been changed.",
};

// Admin password reset by emailed code: email -> 6-digit code -> new password. The API answers the send the same
// for every email, so this never says whether an admin account exists.
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  // Kept only in memory for the final reset call; never stored or put in the URL.
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    if (!value) return setError("Enter your email.");
    void run(async () => {
      await sendPasswordResetCode(value);
      setEmail(value);
      setCode("");
      setStep("code");
    });
  }

  function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    if (!CODE_PATTERN.test(value)) return setError("Enter the 6-digit code from the email.");
    void run(async () => {
      await verifyPasswordResetCode(email, value);
      setCode(value);
      setStep("password");
    });
  }

  function resendCode() {
    void run(async () => {
      await sendPasswordResetCode(email);
      setNotice("We've sent a new code. Only the latest code works.");
    });
  }

  function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password.length > MAX_PASSWORD) return setError(`Use at most ${MAX_PASSWORD} characters.`);
    if (password !== confirm) return setError("The passwords don't match.");
    void run(async () => {
      try {
        await resetPasswordWithCode(email, code, password);
      } catch (err) {
        // The code expired or ran out of attempts after it was checked: start again from a new code.
        if (err instanceof ApiError && err.code.startsWith("OTP_")) setStep("code");
        throw err;
      }
      setCode("");
      setStep("done");
    });
  }

  const subtitle = step === "code" ? `If an admin account exists for ${email}, we've sent it a 6-digit code.` : SUBTITLES[step];
  const title = step === "done" ? "Password updated" : step === "password" ? "Set a new password" : step === "code" ? "Enter verification code" : "Forgot password?";

  return (
    <AuthCard title={title} subtitle={subtitle}>
      {error && <AuthError message={error} />}
      {notice && <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{notice}</p>}

      {step === "email" && (
        <form className="flex flex-col gap-4" onSubmit={submitEmail} noValidate>
          <Input label="Email" name="email" type="email" placeholder="Enter your email" autoComplete="email" defaultValue={email} required />
          <SubmitButton busy={isSubmitting} label="Send code" busyLabel="Sending..." />
        </form>
      )}

      {step === "code" && (
        <form className="flex flex-col gap-4" onSubmit={submitCode} noValidate>
          <Input
            label="Verification code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6-digit code"
            className="text-center tracking-[0.4em]"
            autoFocus
            required
          />
          <SubmitButton busy={isSubmitting} label="Verify code" busyLabel="Verifying..." />
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStep("email"); setError(null); setNotice(null); }} className="font-medium text-zinc-500 hover:text-zinc-800">
              Change email
            </button>
            <button type="button" onClick={resendCode} disabled={isSubmitting} className="font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50">
              Resend code
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form className="flex flex-col gap-4" onSubmit={submitPassword} noValidate>
          <Input label="New password" name="password" type="password" autoComplete="new-password" autoFocus required />
          <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
          <SubmitButton busy={isSubmitting} label="Reset password" busyLabel="Saving..." />
        </form>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          <Link href="/login" className={PRIMARY_LINK}>
            Sign in
          </Link>
        </div>
      )}

      {step !== "done" && (
        <div className="mt-5 text-center">
          <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
            Back to sign in
          </Link>
        </div>
      )}
    </AuthCard>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <Button type="submit" variant="primary" className="mt-1 w-full" disabled={busy}>
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {busyLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
