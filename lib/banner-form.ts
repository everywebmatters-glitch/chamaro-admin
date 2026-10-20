// Pure helpers for the banner form (type-only imports, unit-tested with `node --test`).
import type { ApiBanner, BannerInput } from "@/lib/api/banners";

export interface BannerFormValues {
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  altText: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  position: string;
  startAt: string; // datetime-local value, "" when unset
  endAt: string;
}

export const EMPTY_BANNER: BannerFormValues = {
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  linkUrl: "",
  altText: "",
  status: "DRAFT",
  position: "0",
  startAt: "",
  endAt: "",
};

function isWebUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// <input type="datetime-local"> works in the browser's local time; the API stores UTC.
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromBanner(banner: ApiBanner): BannerFormValues {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? "",
    imageUrl: banner.imageUrl,
    mobileImageUrl: banner.mobileImageUrl ?? "",
    linkUrl: banner.linkUrl ?? "",
    altText: banner.altText ?? "",
    status: banner.status,
    position: String(banner.position),
    startAt: toLocalInput(banner.startAt),
    endAt: toLocalInput(banner.endAt),
  };
}

export type BannerErrors = Partial<Record<keyof BannerFormValues, string>>;

export function validateBanner(values: BannerFormValues): BannerErrors {
  const errors: BannerErrors = {};
  if (!values.title.trim()) errors.title = "Enter a title.";
  else if (values.title.trim().length > 191) errors.title = "Use 191 characters or fewer.";
  if (values.subtitle.length > 500) errors.subtitle = "Use 500 characters or fewer.";
  if (!values.imageUrl.trim()) errors.imageUrl = "Upload an image or paste its web address.";
  else if (!isWebUrl(values.imageUrl.trim())) errors.imageUrl = "The image address must start with http:// or https://.";
  if (values.mobileImageUrl.trim() && !isWebUrl(values.mobileImageUrl.trim())) errors.mobileImageUrl = "The address must start with http:// or https://.";
  if (values.linkUrl.trim() && !isWebUrl(values.linkUrl.trim())) errors.linkUrl = "The link must start with http:// or https://.";
  if (values.altText.length > 500) errors.altText = "Use 500 characters or fewer.";
  if (!/^\d+$/.test(values.position.trim())) errors.position = "Enter a whole number, 0 or more.";
  const start = values.startAt ? new Date(values.startAt).getTime() : null;
  const end = values.endAt ? new Date(values.endAt).getTime() : null;
  if (start !== null && Number.isNaN(start)) errors.startAt = "Enter a valid date and time.";
  if (end !== null && Number.isNaN(end)) errors.endAt = "Enter a valid date and time.";
  if (start !== null && end !== null && !Number.isNaN(start) && !Number.isNaN(end) && end <= start) errors.endAt = "The end must be after the start.";
  return errors;
}

// Empty optional fields are left out: the API only accepts values (it cannot blank a stored one).
export function toBannerInput(values: BannerFormValues): BannerInput {
  const optional = (value: string) => (value.trim() ? value.trim() : undefined);
  const mobileImageUrl = optional(values.mobileImageUrl);
  const linkUrl = optional(values.linkUrl);
  const altText = optional(values.altText);
  return {
    title: values.title.trim(),
    subtitle: values.subtitle.trim(), // always sent, so an edit can clear it
    imageUrl: values.imageUrl.trim(),
    ...(mobileImageUrl ? { mobileImageUrl } : {}),
    ...(linkUrl ? { linkUrl } : {}),
    ...(altText ? { altText } : {}),
    status: values.status,
    position: Number(values.position),
    ...(values.startAt ? { startAt: new Date(values.startAt).toISOString() } : {}),
    ...(values.endAt ? { endAt: new Date(values.endAt).toISOString() } : {}),
  };
}
