"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { createAdminCmsPage, getAdminCmsPage, updateAdminCmsPage } from "@/lib/api/cms-pages";
import { getSessionToken } from "@/lib/auth/session";
import { EMPTY_PAGE, fromPage, hasErrors, NEW_SECTION, slugify, toPageInput, validatePage, type PageErrors, type PageFormValues } from "@/lib/cms-page-form";

interface CmsPageFormProps {
  mode: "create" | "edit";
  pageId?: string;
}

export function CmsPageForm({ mode, pageId }: CmsPageFormProps) {
  const router = useRouter();
  const { logout } = useAdminSession();
  const [values, setValues] = useState<PageFormValues>(EMPTY_PAGE);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [loadState, setLoadState] = useState<"loading" | "ready" | { error: ApiError }>(mode === "edit" ? "loading" : "ready");
  const [reloadCount, setReloadCount] = useState(0);
  const [errors, setErrors] = useState<PageErrors>({ sections: [] });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (mode !== "edit") return;
    if (!pageId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the edit page was opened without ?id=
      setLoadState({ error: new ApiError(404, "NOT_FOUND", "No page was selected.") });
      return;
    }
    const controller = new AbortController();
    getAdminCmsPage(getSessionToken() ?? "", pageId, controller.signal)
      .then((page) => {
        setValues(fromPage(page));
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the page.");
        if (apiError.status === 401) return logout();
        setLoadState({ error: apiError });
      });
    return () => controller.abort();
  }, [mode, pageId, reloadCount, logout]);

  const setField = <K extends Exclude<keyof PageFormValues, "sections">>(key: K, value: PageFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const setSection = (index: number, patch: Partial<PageFormValues["sections"][number]>) => {
    setValues((current) => ({ ...current, sections: current.sections.map((section, i) => (i === index ? { ...section, ...patch } : section)) }));
    setErrors((current) => ({ ...current, sections: current.sections.map((error, i) => (i === index ? undefined : error)) }));
  };
  const moveSection = (index: number, by: -1 | 1) => {
    setValues((current) => {
      const sections = [...current.sections];
      const target = index + by;
      if (target < 0 || target >= sections.length) return current;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
    setErrors((current) => ({ ...current, sections: values.sections.map(() => undefined) }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validatePage(values);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = getSessionToken() ?? "";
      const input = toPageInput(values);
      if (mode === "create") await createAdminCmsPage(token, input);
      else await updateAdminCmsPage(token, pageId ?? "", input);
      router.push("/cms-pages/");
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the page.");
      if (apiError.status === 401) return logout();
      if (apiError.code === "DUPLICATE_RECORD") setErrors((current) => ({ ...current, slug: "Another page already uses this slug." }));
      else setNotice({ tone: "error", text: apiError.message });
      setSaving(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Loading page..." />;
  if (loadState !== "ready") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={loadState.error.status === 404 ? "Page not found" : "Couldn't load the page"}
        description={loadState.error.message}
        action={
          loadState.error.status === 404 ? (
            <Link href="/cms-pages/">
              <Button variant="secondary">Back to pages</Button>
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

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <PageHeader
        title={mode === "create" ? "Add Page" : `Edit ${values.title || "Page"}`}
        description="Content pages stored in the Chamaro API and served at /api/v1/cms/pages/{slug} once published."
        actions={
          <>
            <Link href="/cms-pages/">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              {saving ? "Saving..." : "Save Page"}
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Saving keeps the page as it is (a new page starts as a draft); use Publish on the pages list to make it public.
          Published pages are used by storefront features configured to read their slug and section types.
        </p>
      </div>

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Page" description="The title and the address (slug) the page is served under.">
          <Input
            label="Title"
            name="title"
            value={values.title}
            onChange={(event) => {
              setField("title", event.target.value);
              if (!slugTouched) setField("slug", slugify(event.target.value));
            }}
            error={errors.title}
            required
          />
          <Input
            label="Slug"
            name="slug"
            value={values.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setField("slug", event.target.value);
            }}
            error={errors.slug}
            hint="Lowercase letters, numbers and hyphens, e.g. shipping-policy."
            required
          />
        </FormSection>

        <FormSection title="Search engines" description="Optional. The API can change these but not clear them once set.">
          <Input label="SEO title" name="seoTitle" value={values.seoTitle} onChange={(event) => setField("seoTitle", event.target.value)} error={errors.seoTitle} />
          <Textarea label="SEO description" name="seoDescription" rows={3} value={values.seoDescription} onChange={(event) => setField("seoDescription", event.target.value)} error={errors.seoDescription} />
        </FormSection>

        <FormSection title="Sections" description="Blocks of content, in order. Each has a type and its content as a JSON object.">
          {values.sections.length === 0 && <p className="text-sm text-zinc-500">No sections yet.</p>}
          {values.sections.map((section, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input label={`Section ${index + 1} type`} name={`section-type-${index}`} value={section.type} onChange={(event) => setSection(index, { type: event.target.value })} />
                </div>
                <Button type="button" variant="secondary" aria-label="Move section up" disabled={index === 0} onClick={() => moveSection(index, -1)} icon={<ArrowUp className="h-4 w-4" />} />
                <Button type="button" variant="secondary" aria-label="Move section down" disabled={index === values.sections.length - 1} onClick={() => moveSection(index, 1)} icon={<ArrowDown className="h-4 w-4" />} />
                <Button
                  type="button"
                  variant="danger"
                  aria-label="Remove section"
                  onClick={() => {
                    setValues((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== index) }));
                    setErrors((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== index) }));
                  }}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
              <Textarea label="Content (JSON)" name={`section-content-${index}`} rows={6} spellCheck={false} className="font-mono text-xs" value={section.content} onChange={(event) => setSection(index, { content: event.target.value })} error={errors.sections[index]} />
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setValues((current) => ({ ...current, sections: [...current.sections, { ...NEW_SECTION }] }))}>
              Add section
            </Button>
          </div>
        </FormSection>
      </div>
    </form>
  );
}
