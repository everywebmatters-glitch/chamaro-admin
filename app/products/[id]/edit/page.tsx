import { ProductForm } from "@/components/products/ProductForm";
import { SHELL_PRODUCT_ID } from "@/lib/api/products";

// Static export: product ids aren't known at build time, so only one shell page is exported
// (/products/_/edit/). public/.htaccess serves it for every /products/:id/edit/ URL.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: SHELL_PRODUCT_ID }];
}

// The product is loaded in the browser from GET /api/v1/admin/products/:id (it needs the admin token).
export default async function EditProductPage(props: PageProps<"/products/[id]/edit">) {
  const { id } = await props.params;
  return <ProductForm mode="edit" productId={id} />;
}
