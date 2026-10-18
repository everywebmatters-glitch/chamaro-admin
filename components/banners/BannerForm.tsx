"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError, resolveApiUrl } from "@/lib/api/client";
import { createAdminBanner, getAdminBanner, updateAdminBanner } from "@/lib/api/banners";
import { IMAGE_ACCEPT, imageFileProblem, uploadMedia } from "@/lib/api/media";
import { getSessionToken } from "@/lib/auth/session";
import { EMPTY_BANNER, fromBanner, toBannerInput, validateBanner, type BannerErrors, type BannerFormValues } from "@/lib/banner-form";

interface BannerFormProps {
  mode: "create" | "edit";
  bannerId?: string;
}

type ImageField = "imageUrl" | "mobileImageUrl";

export function BannerForm({ mode, bannerId }: BannerFormProps) {
  const router = useRouter();
  const { logout } = useAdminSession();
  const [values, setValues] = useState<BannerFormValues>(EMPTY_BANNER);
  const [loadState, setLoadState] = useState<"loading" | "ready" | { error: ApiError }>(mode === "edit" ? "loading" : "ready");
  const [reloadCount, setReloadCount] = useState(0);
  const [errors, setErrors] = useState<BannerErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (mode !== "edit") return;
    if (!bannerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the edit page was opened without ?id=
      setLoadState({ error: new ApiError(404, "NOT_FOUND", "No banner was selected.") });
      return;
    }
    const controller = new AbortController();
    getAdminBanner(getSessionToken() ?? "", bannerId, controller.signal)
      .then((banner) => {
        setValues(fromBanner(banner));
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the banner.");
        if (apiError.status === 401) return logout();
        setLoadState({ error: apiError });
      });
    return () => controller.abort();
  }, [mode, bannerId, reloadCount, logout]);

  const set = <K extends keyof BannerFormValues>(key: K, value: BannerFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function upload(field: ImageField, files: File[]) {
    const file = files[0];
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) {
      setErrors((current) => ({ ...current, [field]: problem }));
      return;
    }
    setUploading(field);
    try {
      const media = await uploadMedia(getSessionToken() ?? "", file);
      // Banners need an absolute web address; uploaded files are served from the API's own origin.
      set(field, resolveApiUrl(media.url));
      if (!values.altText && field === "imageUrl") set("altText", values.title);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Upload failed.");
      if (apiError.status === 401) return logout();
      setErrors((current) => ({ ...current, [field]: apiError.message }));
    } finally {
      setUploading(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateBanner(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = getSessionToken() ?? "";
      const input = toBannerInput(values);
      if (mode === "create") await createAdminBanner(token, input);
      else await updateAdminBanner(token, bannerId ?? "", input);
      router.push("/banners/");
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the banner.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.status === 400 ? `The API rejected the banner: ${apiError.message}` : apiError.message });
      setSaving(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Loading banner..." />;
  if (loadState !== "ready") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={loadState.error.status === 404 ? "Banner not found" : "Couldn't load the banner"}
        description={loadState.error.message}
        action={
          loadState.error.status === 404 ? (
            <Link href="/banners/">
              <Button variant="secondary">Back to banners</Button>
            </Link>
          ) : (
            <Button variant="secondary" onClick={() => setReloadCount((n) => n + 1)}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  const imageField = (field: ImageField, label: string, hint: string, error?: string) => (
    <div className="flex flex-col gap-3">
      <ImageUploader
        label={label}
        aspect="wide"
        hint={hint}
        accept={IMAGE_ACCEPT}
        formats="JPEG, PNG or WebP up to 5 MB"
        busy={uploading === field}
        disabled={saving}
        onFiles={(files) => void upload(field, files)}
      />
      {values[field] && (
        <div className="h-24 w-full max-w-xs overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
          <ImagePreview size="lg" label={label} src={values[field]} className="rounded-none" />
        </div>
      )}
      <Input
        label="or paste an image address"
        name={field}
        placeholder="https://..."
        value={values[field]}
        onChange={(event) => set(field, event.target.value)}
        error={error}
      />
    </div>
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <PageHeader
        title={mode === "create" ? "Add Banner" : `Edit ${values.title || "Banner"}`}
        description="Banners are stored in the Chamaro API and served at /api/v1/cms/banners."
        actions={
          <>
            <Link href="/banners/">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={saving || uploading !== null} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              {saving ? "Saving..." : "Save Banner"}
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Only Active banners inside their schedule are returned by the public API. The storefront home page does not display
          them yet, so saving a banner does not change the live site.
        </p>
      </div>

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Images" description="The main banner image, and an optional narrower one for phones.">
          {imageField("imageUrl", "Banner image", "Recommended size 1920x640px.", errors.imageUrl)}
          {imageField("mobileImageUrl", "Mobile image (optional)", "Shown instead of the main image on small screens.", errors.mobileImageUrl)}
          {mode === "edit" && <p className="text-xs text-zinc-500">The API can change an optional image or link but not clear it. To remove one, delete the banner and create it again.</p>}
        </FormSection>

        <FormSection title="Content" description="Title, link and description of the image.">
          <Input label="Title" name="title" placeholder="e.g. Autumn Collection Is Here" value={values.title} onChange={(event) => set("title", event.target.value)} error={errors.title} required />
          <Input label="Link (optional)" name="linkUrl" placeholder="https://..." value={values.linkUrl} onChange={(event) => set("linkUrl", event.target.value)} error={errors.linkUrl} hint="Where the banner leads when clicked." />
          <Input label="Image description (optional)" name="altText" value={values.altText} onChange={(event) => set("altText", event.target.value)} error={errors.altText} hint="Read aloud by screen readers." />
        </FormSection>

        <FormSection title="Display settings" description="Control order and visibility.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Display order" name="position" type="number" min="0" value={values.position} onChange={(event) => set("position", event.target.value)} error={errors.position} hint="Lowest number shows first." />
            <Select label="Status" name="status" value={values.status} onChange={(event) => set("status", event.target.value as BannerFormValues["status"])}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
        </FormSection>

        <FormSection title="Scheduling" description="Optionally limit when this banner is shown. Leave blank to show it whenever it is Active. Your local time is used.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start date/time" name="startAt" type="datetime-local" value={values.startAt} onChange={(event) => set("startAt", event.target.value)} error={errors.startAt} />
            <Input label="End date/time" name="endAt" type="datetime-local" value={values.endAt} onChange={(event) => set("endAt", event.target.value)} error={errors.endAt} />
          </div>
        </FormSection>
      </div>
    </form>
  );
}
