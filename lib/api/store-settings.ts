import { apiRequest } from "@/lib/api/client";

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  timezone: string;
}

export function getStoreSettings(token: string, signal?: AbortSignal) {
  return apiRequest<StoreSettings>("/admin/store-settings", { token, signal });
}

export function saveStoreSettings(token: string, settings: StoreSettings) {
  return apiRequest<StoreSettings>("/admin/store-settings", { method: "PUT", token, body: settings });
}
