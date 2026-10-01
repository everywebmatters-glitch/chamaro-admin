"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-5 w-5 text-red-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">Something went wrong</p>
        <p className="text-sm text-zinc-500">{error.message || "An unexpected error occurred. Please try again."}</p>
      </div>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
