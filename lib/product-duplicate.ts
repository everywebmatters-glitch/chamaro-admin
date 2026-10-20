// Pure helper for "Duplicate" on the products list (type-only imports, unit-tested with `node --test`).
import type { ApiProduct, CreateProductInput, ProductVariantInput } from "@/lib/api/products";

const suffix = (attempt: number) => (attempt <= 1 ? "-copy" : `-copy-${attempt}`);

// A new draft built from an existing product. Name, slug and variant SKUs must be unique, so each gets a
// "copy" suffix ("-copy", then "-copy-2"... for later attempts). The product's own SKU is left off (unique too).
// Images share the same uploaded files; variant options (photos, stock, prices) are carried over as they are.
export function duplicateProductInput(product: ApiProduct, attempt = 1): CreateProductInput {
  const tag = suffix(attempt);
  const images = product.images.filter((image) => image.mediaId);
  return {
    name: `${product.name.slice(0, 191 - 7)} (Copy${attempt > 1 ? ` ${attempt}` : ""})`,
    slug: `${product.slug.slice(0, 191 - tag.length)}${tag}`,
    price: Number(product.price),
    categoryId: product.categoryId,
    status: "DRAFT",
    ...(product.description ? { description: product.description } : {}),
    ...(product.shortDescription ? { shortDescription: product.shortDescription } : {}),
    ...(product.infoBoxes?.length ? { infoBoxes: product.infoBoxes.map(({ title, text }) => ({ title, text })) } : {}),
    ...(product.features ? { features: product.features } : {}),
    ...(product.materials ? { materials: product.materials } : {}),
    ...(product.specifications ? { specifications: product.specifications.map(({ label, value }) => ({ label, value })) } : {}),
    ...(product.returnPolicy ? { returnPolicy: product.returnPolicy } : {}),
    ...(product.warranty ? { warranty: product.warranty } : {}),
    ...(product.compareAtPrice != null ? { compareAtPrice: Number(product.compareAtPrice) } : {}),
    ...(product.inventory ? { quantity: product.inventory.quantity } : {}),
    images: images.map((image, position) => ({
      mediaId: image.mediaId!,
      position,
      isPrimary: position === 0,
      ...(image.altText ? { altText: image.altText } : {}),
    })),
    variants: product.variants.map((variant) => ({
      name: variant.name,
      sku: `${variant.sku.slice(0, 191 - tag.length)}${tag.toUpperCase()}`,
      options: variant.options as ProductVariantInput["options"],
      ...(variant.price != null ? { price: Number(variant.price) } : {}),
      status: variant.status,
    })),
  };
}
