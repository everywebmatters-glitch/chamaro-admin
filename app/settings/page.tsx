"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/api/client";
import { getStoreSettings, saveStoreSettings, type StoreSettings } from "@/lib/api/store-settings";
import { getSessionToken } from "@/lib/auth/session";

const EMPTY_SETTINGS: StoreSettings = {
  storeName: "",
  supportEmail: "",
  supportPhone: "",
  currency: "",
  timezone: "",
};

export default function SettingsPage() {
  const { admin, logout } = useAdminSession();
  const [settings, setSettings] = useState<StoreSettings>(EMPTY_SETTINGS);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getStoreSettings(getSessionToken() ?? "", controller.signal)
      .then((loadedSettings) => {
        setSettings(loadedSettings);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load store settings.");
        if (apiError.status === 401) return logout();
        setLoadError(apiError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(reloadCount);
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const loading = loadedKey !== reloadCount;
  function update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveStoreSettings(getSessionToken() ?? "", settings);
      setSettings(saved);
      setNotice({ tone: "success", text: "Store settings saved." });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save store settings.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.message });
    } finally {
      setSaving(false);
    }
  }

  let content;
  if (loading) {
    content = <LoadingState label="Loading store settings..." />;
  } else if (loadError) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load store settings"
        description={loadError.message}
        action={<Button variant="secondary" onClick={() => setReloadCount((count) => count + 1)}>Try again</Button>}
      />
    );
  } else {
    content = (
      <form onSubmit={submit} className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input label="Store name" name="storeName" value={settings.storeName} onChange={(event) => update("storeName", event.target.value)} required maxLength={191} />
          <Input label="Support email" name="supportEmail" type="email" value={settings.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} maxLength={191} />
          <Input label="Support phone" name="supportPhone" type="tel" value={settings.supportPhone} onChange={(event) => update("supportPhone", event.target.value)} maxLength={32} />
          <Input label="Currency code" name="currency" value={settings.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" placeholder="INR" hint="Use a three-letter ISO 4217 code, such as INR." />
          <Input label="Timezone" name="timezone" value={settings.timezone} onChange={(event) => update("timezone", event.target.value)} required maxLength={100} placeholder="Asia/Kolkata" hint="Use an IANA timezone, such as Asia/Kolkata." />
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" variant="primary" disabled={saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Store Settings" description="Manage your store name, support contacts, currency, and timezone." />
      <SettingsTabs />
      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}
      {content}
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
    </div>
  );
}
