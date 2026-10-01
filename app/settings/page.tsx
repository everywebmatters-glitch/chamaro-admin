import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Store Settings" description="Manage your store information and admin preferences." />

      <SettingsTabs />

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Store information" description="Basic information about your store.">
          <Input label="Store name" name="storeName" defaultValue="Chamaro" />
          <Textarea label="Store description" name="storeDescription" defaultValue="A modern e-commerce store for everyday essentials." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Support email" name="supportEmail" type="email" defaultValue="support@chamaro.com" />
            <Input label="Support phone" name="supportPhone" type="tel" defaultValue="+1 (555) 010-2938" />
          </div>
        </FormSection>

        <FormSection title="Admin profile" description="Your personal admin account details.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full name" name="adminName" defaultValue="Chamaro Admin" />
            <Input label="Email" name="adminEmail" type="email" defaultValue="admin@chamaro.com" />
          </div>
          <Input label="New password" name="password" type="password" placeholder="Leave blank to keep current password" />
        </FormSection>

        <FormSection title="General settings" description="Regional and display preferences.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Currency" name="currency" defaultValue="USD" />
            <Input label="Timezone" name="timezone" defaultValue="UTC-05:00 (Eastern Time)" />
          </div>
        </FormSection>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save Changes</Button>
      </div>
    </div>
  );
}
