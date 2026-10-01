"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";
import type { Banner } from "@/lib/types";

interface BannerFormProps {
  mode: "create" | "edit";
  banner?: Banner;
}

export function BannerForm({ mode, banner }: BannerFormProps) {
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/banners");
      }}
    >
      <PageHeader
        title={mode === "create" ? "Add Banner" : `Edit ${banner?.title ?? "Banner"}`}
        description="This banner appears on the Chamaro customer-facing homepage."
        actions={
          <>
            <Link href="/banners">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary">
              Save Banner
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Globe className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Saving this banner will publish it directly to the live customer homepage.</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Banner image" description="The main visual shown across the homepage hero.">
          <ImageUploader label="Banner image" aspect="wide" hint="Recommended size 1920x640px." />
        </FormSection>

        <FormSection title="Content" description="Text shown over the banner image.">
          <Input label="Title" name="title" placeholder="e.g. Autumn Collection Is Here" defaultValue={banner?.title} required />
          <Input label="Subtitle" name="subtitle" placeholder="e.g. Discover cozy essentials for the season" defaultValue={banner?.subtitle} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Button text" name="buttonText" placeholder="e.g. Shop Now" defaultValue={banner?.buttonText} />
            <Input label="Button URL" name="buttonUrl" placeholder="/collections/autumn" defaultValue={banner?.buttonUrl} />
          </div>
        </FormSection>

        <FormSection title="Display settings" description="Control order and visibility.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Display order" name="order" type="number" min="1" defaultValue={banner?.order ?? 1} />
            <Select label="Status" name="status" defaultValue={banner?.status ?? "Active"}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        </FormSection>

        <FormSection title="Scheduling" description="Optionally schedule when this banner goes live. Leave blank to show it as long as it's active.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start date/time" name="startAt" type="datetime-local" defaultValue={banner?.startAt} />
            <Input label="End date/time" name="endAt" type="datetime-local" defaultValue={banner?.endAt} />
          </div>
        </FormSection>
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/banners">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <Button type="submit" variant="primary">
          Save Banner
        </Button>
      </div>
    </form>
  );
}
