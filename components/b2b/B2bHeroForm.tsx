"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError, resolveApiUrl } from "@/lib/api/client";
import { createAdminCmsPage, listAdminCmsPages, setAdminCmsPagePublished, updateAdminCmsPage, type ApiCmsPage } from "@/lib/api/cms-pages";
import { IMAGE_ACCEPT, imageFileProblem, uploadMedia } from "@/lib/api/media";
import { getSessionToken } from "@/lib/auth/session";
import {
  B2B_PAGE_SLUG,
  DEFAULT_B2B_HERO_VALUES,
  fromB2bPage,
  toB2bPageInput,
  validateB2bHero,
  type B2bHeroErrors,
  type B2bHeroValues,
} from "@/lib/b2b-hero";

type LoadState = "loading" | "ready" | { error: ApiError };

export function B2bHeroForm() {
  const { logout } = useAdminSession();
  const [page, setPage] = useState<ApiCmsPage | null>(null);
  const [values, setValues] = useState<B2bHeroValues>(DEFAULT_B2B_HERO_VALUES);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reloadCount, setReloadCount] = useState(0);
  const [errors, setErrors] = useState<B2bHeroErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listAdminCmsPages(getSessionToken() ?? "", controller.signal)
      .then(({ pages }) => {
        const existing = pages.find((item) => item.slug === B2B_PAGE_SLUG) ?? null;
        setPage(existing);
        setValues(fromB2bPage(existing));
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the B2B page.");
        if (apiError.status === 401) return logout();
        setLoadState({ error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const set = <K extends keyof B2bHeroValues>(key: K, value: B2bHeroValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice(null);
  };

  async function upload(files: File[]) {
    const file = files[0];
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) {
      setErrors((current) => ({ ...current, imageUrl: problem }));
      return;
    }
    setUploading(true);
    setNotice(null);
    try {
      const media = await uploadMedia(getSessionToken() ?? "", file, values.imageAlt);
      set("imageUrl", resolveApiUrl(media.url));
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Image upload failed.");
      if (apiError.status === 401) return logout();
      setErrors((current) => ({ ...current, imageUrl: apiError.message }));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateB2bHero(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = getSessionToken() ?? "";
      const input = toB2bPageInput(values, page);
      let saved = page
        ? await updateAdminCmsPage(token, page.id, input)
        : await createAdminCmsPage(token, input);
      setPage(saved);
      if (saved.status !== "PUBLISHED") {
        saved = await setAdminCmsPagePublished(token, saved.id, true);
        setPage(saved);
      }
      setNotice({ tone: "success", text: "B2B hero published. The storefront should show the update within about a minute." });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the B2B hero.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.status === 400 ? `The API rejected the content: ${apiError.message}` : apiError.message });
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Loading B2B page..." />;
  if (loadState !== "ready") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the B2B page"
        description={loadState.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setLoadState("loading");
              setReloadCount((count) => count + 1);
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <PageHeader
        title="B2B Page"
        description="Edit the hero shown at the top of the storefront’s B2B page."
        actions={
          <Button type="submit" variant="primary" disabled={saving || uploading} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
            {saving ? "Publishing..." : "Save & Publish"}
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {page
            ? "The B2B hero is stored in the CMS page “b2b”."
            : "Saving creates and publishes the CMS page “b2b” for the storefront."}{" "}
          Changes can take about a minute to appear. The layout and type styles follow the home page and are not editable here.
        </p>
      </div>

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Hero content" description="The text and call-to-action displayed beside the hero image.">
          <Input label="Eyebrow" name="eyebrow" value={values.eyebrow} onChange={(event) => set("eyebrow", event.target.value)} error={errors.eyebrow} required />
          <Input label="Heading" name="title" value={values.title} onChange={(event) => set("title", event.target.value)} error={errors.title} required />
          <Textarea label="Description" name="description" rows={4} value={values.description} onChange={(event) => set("description", event.target.value)} error={errors.description} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Button text" name="buttonLabel" value={values.buttonLabel} onChange={(event) => set("buttonLabel", event.target.value)} error={errors.buttonLabel} required />
            <Input
              label="Button link"
              name="buttonUrl"
              placeholder="#quote"
              value={values.buttonUrl}
              onChange={(event) => set("buttonUrl", event.target.value)}
              error={errors.buttonUrl}
              hint="A site path, #quote anchor, or full http(s) address."
              required
            />
          </div>
        </FormSection>

        <FormSection title="Hero image" description="A wide image works best. The storefront crops it to fit the hero. Leave it blank to keep the built-in photo.">
          <ImageUploader
            label="Upload image"
            aspect="wide"
            hint="JPEG, PNG or WebP, up to 5 MB."
            accept={IMAGE_ACCEPT}
            formats="JPEG, PNG or WebP up to 5 MB"
            busy={uploading}
            disabled={saving}
            onFiles={(files) => void upload(files)}
          />
          {errors.imageUrl && <p role="alert" className="text-sm text-red-600">{errors.imageUrl}</p>}
          {values.imageUrl && <ImagePreview size="lg" className="aspect-video max-h-64" label={values.imageAlt || "B2B hero image"} src={values.imageUrl} />}
          <Input label="Image description (alt text)" name="imageAlt" value={values.imageAlt} onChange={(event) => set("imageAlt", event.target.value)} error={errors.imageAlt} hint="Describe the image for visitors using screen readers." />
        </FormSection>
      </div>
    </form>
  );
}
