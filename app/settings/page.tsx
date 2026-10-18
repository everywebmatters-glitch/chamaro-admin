"use client";

import { PlugZap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { useAdminSession } from "@/components/auth/AuthProvider";

export default function SettingsPage() {
  const { admin } = useAdminSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Store Settings" description="Manage your store information and admin preferences." />

      <SettingsTabs />

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Signed in as</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Name</dt>
            <dd className="text-zinc-900">{admin.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd className="text-zinc-900">{admin.email}</dd>
          </div>
        </dl>
      </div>

      <EmptyState
        icon={PlugZap}
        title="Store settings are not connected to the API yet"
        description="Store name, support contact details, currency and timezone are not stored anywhere yet, so there is nothing to edit here. Changing your own name or password also needs an API endpoint that does not exist yet."
      />
    </div>
  );
}
