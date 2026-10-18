import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlugZap } from "lucide-react";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Admin Users" description="Manage who has access to the Chamaro admin panel." />
      <SettingsTabs />
      <EmptyState
        icon={PlugZap}
        title="Not connected to the API yet"
        description="The API can create admins (POST /api/v1/admin/admins) but has no endpoint to list or deactivate them. Until GET /api/v1/admin/admins exists, manage admin accounts with the backend scripts (admin:create, admin:promote, admin:delete)."
      />
    </div>
  );
}
