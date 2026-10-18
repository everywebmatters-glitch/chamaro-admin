"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BannerForm } from "@/components/banners/BannerForm";
import { LoadingState } from "@/components/ui/LoadingState";

// Static export: banner ids are not known at build time, so the id travels as /banners/edit/?id=<id>.
function EditBanner() {
  const id = useSearchParams().get("id") ?? undefined;
  return <BannerForm mode="edit" bannerId={id} />;
}

export default function EditBannerPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading banner..." />}>
      <EditBanner />
    </Suspense>
  );
}
