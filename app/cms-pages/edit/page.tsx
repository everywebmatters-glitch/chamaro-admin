"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CmsPageForm } from "@/components/cms/CmsPageForm";
import { LoadingState } from "@/components/ui/LoadingState";

// Static export: page ids are not known at build time, so the id travels as /cms-pages/edit/?id=<id>.
function EditCmsPage() {
  const id = useSearchParams().get("id") ?? undefined;
  return <CmsPageForm mode="edit" pageId={id} />;
}

export default function EditCmsPageRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading page..." />}>
      <EditCmsPage />
    </Suspense>
  );
}
