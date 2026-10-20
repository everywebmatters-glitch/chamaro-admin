import type { ReactNode } from "react";
import { AlertCircle, Store } from "lucide-react";

// The centred card the public auth screens (forgot / reset password) share; same look as the login page.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
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
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
