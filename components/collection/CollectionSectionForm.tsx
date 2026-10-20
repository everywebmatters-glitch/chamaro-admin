"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Info, Loader2, Trash2 } from "lucide-react";
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
  COLLECTION_PAGE_SLUG,
  DEFAULT_COLLECTION_VALUES,
  MAX_COLLECTION_IMAGES,
  fromPage,
  hasErrors,
  toPageInput,
  validateCollection,
  type CollectionErrors,
  type CollectionFormValues,
} from "@/lib/collection-feature";

type LoadState = "loading" | "ready" | { error: ApiError };

export function CollectionSectionForm() {
  const { logout } = useAdminSession();
  const [values, setValues] = useState<CollectionFormValues>(DEFAULT_COLLECTION_VALUES);
  const [page, setPage] = useState<ApiCmsPage | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reloadCount, setReloadCount] = useState(0);
  const [errors, setErrors] = useState<CollectionErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listAdminCmsPages(getSessionToken() ?? "", controller.signal)
      .then(({ pages }) => {
        const existing = pages.find((item) => item.slug === COLLECTION_PAGE_SLUG) ?? null;
        setPage(existing);
        setValues(fromPage(existing));
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the section.");
        if (apiError.status === 401) return logout();
        setLoadState({ error: apiError });
      });
    return () => controller.abort();
  }, [reloadCount, logout]);

  const set = <K extends keyof CollectionFormValues>(key: K, value: CollectionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setNotice(null);
  };

  async function upload(files: File[]) {
    const room = MAX_COLLECTION_IMAGES - values.images.length;
    const chosen = files.slice(0, room);
    if (chosen.length === 0) {
      setErrors((current) => ({ ...current, images: `Use ${MAX_COLLECTION_IMAGES} images or fewer.` }));
      return;
    }
    const problem = chosen.map(imageFileProblem).find(Boolean);
    if (problem) {
      setErrors((current) => ({ ...current, images: problem }));
      return;
    }
    setUploading(true);
    try {
      const added: CollectionFormValues["images"] = [];
      for (const file of chosen) {
        const media = await uploadMedia(getSessionToken() ?? "", file);
        // The storefront needs an absolute web address; uploaded files are served from the API's own origin.
        added.push({ url: resolveApiUrl(media.url), alt: "" });
      }
      setValues((current) => ({ ...current, images: [...current.images, ...added] }));
      setErrors((current) => ({ ...current, images: undefined }));
      setNotice(null);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Upload failed.");
      if (apiError.status === 401) return logout();
      setErrors((current) => ({ ...current, images: apiError.message }));
    } finally {
      setUploading(false);
    }
  }

  const updateImage = (index: number, alt: string) =>
    setValues((current) => ({ ...current, images: current.images.map((image, i) => (i === index ? { ...image, alt } : image)) }));
  const removeImage = (index: number) => setValues((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));
  const moveImage = (index: number, by: -1 | 1) =>
    setValues((current) => {
      const images = [...current.images];
      const target = index + by;
      if (target < 0 || target >= images.length) return current;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...current, images };
    });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateCollection(values);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = getSessionToken() ?? "";
      const input = toPageInput(values);
      let saved: ApiCmsPage;
      if (page) saved = await updateAdminCmsPage(token, page.id, input);
      else saved = await createAdminCmsPage(token, input);
      // The storefront only reads published pages.
      if (saved.status !== "PUBLISHED") saved = { ...saved, ...(await setAdminCmsPagePublished(token, saved.id, true)) };
      setPage(saved);
      setNotice({ tone: "success", text: "Saved. The home page shows the change within about a minute." });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the section.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.status === 400 ? `The API rejected the section: ${apiError.message}` : apiError.message });
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Loading section..." />;
  if (loadState !== "ready") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the section"
        description={loadState.error.message}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setLoadState("loading");
              setReloadCount((n) => n + 1);
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
        title="Collection Section"
        description="The “A Collection Made for Comfort” block on the home page."
        actions={
          <Button type="submit" variant="primary" disabled={saving || uploading} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {page
            ? "This block is live on the home page. Changes can take about a minute to show."
            : "Nothing has been saved yet, so the home page shows its built-in text and photos. Save to take control of them."}{" "}
          The layout, fonts and the position of the text and photos are fixed.
        </p>
      </div>

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Content" description="The heading, description and button shown beside the photos.">
          <Input label="Heading" name="heading" value={values.heading} onChange={(event) => set("heading", event.target.value)} error={errors.heading} required />
          <Textarea label="Description" name="text" rows={4} value={values.text} onChange={(event) => set("text", event.target.value)} error={errors.text} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Button text" name="buttonLabel" value={values.buttonLabel} onChange={(event) => set("buttonLabel", event.target.value)} error={errors.buttonLabel} />
            <Input
              label="Button link"
              name="buttonUrl"
              placeholder="/products"
              value={values.buttonUrl}
              onChange={(event) => set("buttonUrl", event.target.value)}
              error={errors.buttonUrl}
              hint="A store page like /products, or a full address."
            />
          </div>
        </FormSection>

        <FormSection title="Photos" description={`Up to ${MAX_COLLECTION_IMAGES} photos that slide automatically, in this order. With none, the built-in photos are shown.`}>
          <ImageUploader
            label="Add photos"
            aspect="wide"
            hint="Square or portrait photos work best; they are cropped to fit."
            accept={IMAGE_ACCEPT}
            formats="JPEG, PNG or WebP up to 5 MB"
            multiple
            busy={uploading}
            disabled={saving || values.images.length >= MAX_COLLECTION_IMAGES}
            onFiles={(files) => void upload(files)}
          />
          {errors.images && <p className="text-sm text-red-600">{errors.images}</p>}

          {values.images.length > 0 && (
            <ul className="flex flex-col gap-3">
              {values.images.map((image, index) => (
                <li key={`${image.url}-${index}`} className="flex items-center gap-3 rounded-md border border-zinc-200 p-3">
                  <ImagePreview size="md" label={image.alt || `Photo ${index + 1}`} src={image.url} />
                  <div className="min-w-0 flex-1">
                    <Input label={`Photo ${index + 1} description (optional)`} name={`alt-${index}`} value={image.alt} onChange={(event) => updateImage(index, event.target.value)} hint="Read aloud by screen readers." />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" aria-label={`Move photo ${index + 1} up`} disabled={index === 0} onClick={() => moveImage(index, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Move photo ${index + 1} down`} disabled={index === values.images.length - 1} onClick={() => moveImage(index, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removeImage(index)} className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {page && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved earlier. Removing every photo and saving shows the built-in photos again.
            </p>
          )}
        </FormSection>
      </div>
    </form>
  );
}
