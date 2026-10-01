import { notFound } from "next/navigation";
import { BannerForm } from "@/components/banners/BannerForm";
import { mockBanners } from "@/lib/mock-data";

// Static export: one page per banner, nothing else
export const dynamicParams = false;

export function generateStaticParams() {
  return mockBanners.map((b) => ({ id: b.id }));
}

export default async function EditBannerPage(props: PageProps<"/banners/[id]/edit">) {
  const { id } = await props.params;
  const banner = mockBanners.find((b) => b.id === id);

  if (!banner) notFound();

  return <BannerForm mode="edit" banner={banner} />;
}
