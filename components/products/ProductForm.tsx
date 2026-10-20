"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Plus, SearchX, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { listAdminCategories, type ApiCategory } from "@/lib/api/categories";
import { imageFileProblem, uploadMedia } from "@/lib/api/media";
import {
  createAdminProduct,
  getAdminProduct,
  SHELL_PRODUCT_ID,
  updateAdminProduct,
  type ApiProduct,
  type CreateProductInput,
  type ProductImageInput,
  type ProductStatusCode,
  type ProductVariantInput,
} from "@/lib/api/products";
import { getSessionToken } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { fromVariantOptions, productTotals, splitImages, toVariantOptions, variantName } from "@/lib/variant-form";
import { detailsToSave, withPresetDetails } from "@/lib/product-details";
import { ColourVariantCard } from "./ColourVariantCard";

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
}

type Field = "name" | "slug" | "description" | "features" | "specifications" | "returnPolicy" | "warranty" | "categoryId" | "variants";
type FieldErrors = Partial<Record<Field, string>>;

export interface ImageRow {
  key: string;
  // Set once the file is stored by the API; null while uploading and for legacy external images.
  mediaId: string | null;
  // What the preview shows: the API path, a legacy external URL, or a local blob: preview while uploading.
  url: string | null;
  altText: string;
  isPrimary: boolean;
  uploading?: boolean;
  filename?: string;
}

// A row of the storefront's Additional Information tab, e.g. Seat height / 45 cm.
interface SpecRow {
  key: string;
  label: string;
  value: string;
}

// One attribute (colour) of the product with its own SKU, prices, stock and photos (see lib/variant-form.ts).
// The product's own price, compare-at price and stock are derived from these when saving.
export interface VariantRow {
  key: string;
  colour: string;
  hex: string; // "#rrggbb", or "" for the default shade of the colour name
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  other: string; // extra options, "Size: L"
  status: ProductStatusCode;
  photos: ImageRow[];
}

// Limits mirror the product body schema in backend/src/routes/product.routes.ts and the Prisma columns behind it.
const MAX_TEXT = 191;
const MAX_DESCRIPTION = 50000;
const MAX_IMAGES = 20;
// Storefront tab limits (mirror the product body schema)
const MAX_LIST_ITEMS = 30;
const MAX_LIST_ITEM = 300;
const MAX_SPECS = 50;
const MAX_SPEC_LABEL = 100;
const MAX_SPEC_VALUE = 500;
const MAX_POLICY = 5000;

// One list item per line, blank lines ignored.
function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function listProblem(items: string[], what: string): string | undefined {
  if (items.length > MAX_LIST_ITEMS) return `Add up to ${MAX_LIST_ITEMS} ${what}.`;
  if (items.some((item) => item.length > MAX_LIST_ITEM)) return `Keep each line under ${MAX_LIST_ITEM} characters.`;
  return undefined;
}
const MAX_PRICE = 9999999999.99; // DECIMAL(12,2)
const MAX_QUANTITY = 2147483647; // INT
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

// Same rule as backend/src/shared/slug.ts normalizeSlug().
function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

let rowCounter = 0;
const newKey = () => `row-${++rowCounter}`;

function priceText(value: string | number | null | undefined): string {
  return value == null || value === "" ? "" : Number(value).toFixed(2);
}

function toImageRow(image: ApiProduct["images"][number]): ImageRow {
  return { key: image.id, mediaId: image.mediaId, url: image.url, altText: image.altText ?? "", isPrimary: false };
}

function blankAttribute(): VariantRow {
  return { key: newKey(), colour: "", hex: "", sku: "", price: "", compareAtPrice: "", stock: "", other: "", status: "ACTIVE", photos: [] };
}

function uploadErrorMessage(file: File, error: ApiError): string {
  if (error.status === 413) return `“${file.name}” is larger than 5 MB.`;
  if (error.status === 415) return `“${file.name}” isn't a JPEG, PNG or WebP image.`;
  return `Couldn't upload “${file.name}”: ${error.message}`;
}

// The form's attributes for a saved product. Products saved before attributes held the media, price and
// stock become one attribute carrying them; photos not owned by any attribute go to the first one.
function initialAttributes(product?: ApiProduct): VariantRow[] {
  if (!product) return [blankAttribute()];
  const images = [...product.images].sort((a, b) => a.position - b.position);
  const { main, byVariant } = splitImages(images, product.variants);

  const rows: VariantRow[] = product.variants.map((variant, index) => {
    const fields = fromVariantOptions(variant.options, variant.name);
    return {
      key: variant.id,
      colour: fields.colour,
      hex: fields.hex,
      sku: variant.sku,
      price: priceText(variant.price ?? product.price),
      compareAtPrice: priceText(fields.compareAtPrice ?? (variant.price == null ? product.compareAtPrice : null)),
      // Before per-attribute stock, the product's stock covered every variant; the first one keeps it.
      stock: String(fields.stock ?? (index === 0 ? product.inventory?.quantity ?? 0 : 0)),
      other: fields.other,
      status: variant.status,
      photos: byVariant[index].map(toImageRow),
    };
  });

  if (!rows.length) {
    rows.push({
      ...blankAttribute(),
      sku: product.sku ?? "",
      price: priceText(product.price),
      compareAtPrice: priceText(product.compareAtPrice),
      stock: String(product.inventory?.quantity ?? 0),
    });
  }
  rows[0] = { ...rows[0], photos: [...main.map(toImageRow), ...rows[0].photos] };
  return rows;
}

// /products/{id}/edit/ → id (the shell page is served under the requested URL)
function productIdFromLocation(): string | undefined {
  const match = window.location.pathname.match(/^\/products\/([^/]+)\/edit\/?$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Loads the product in edit mode, then renders the form with its values.
export function ProductForm({ mode, productId }: ProductFormProps) {
  const { logout } = useAdminSession();
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; product?: ApiProduct } | { status: "error"; error: ApiError }>(
    mode === "create" ? { status: "ready" } : { status: "loading" }
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const id = productId === SHELL_PRODUCT_ID ? productIdFromLocation() : productId;
    if (mode !== "edit" || !id) return;
    const controller = new AbortController();
    getAdminProduct(getSessionToken() ?? "", id, controller.signal)
      .then((product) => setState({ status: "ready", product }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load the product.");
        if (apiError.status === 401) return logout();
        setState({ status: "error", error: apiError });
      });
    return () => controller.abort();
  }, [mode, productId, attempt, logout]);

  if (state.status === "loading") return <LoadingState label="Loading product..." />;

  if (state.status === "error") {
    const notFound = state.error.status === 404;
    return (
      <EmptyState
        icon={notFound ? SearchX : AlertTriangle}
        title={notFound ? "Product not found" : "Couldn't load the product"}
        description={notFound ? "It may have been deleted." : state.error.message}
        action={
          notFound ? (
            <Link href="/products">
              <Button variant="secondary">Back to Products</Button>
            </Link>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          )
        }
      />
    );
  }

  return <ProductFormFields mode={mode} product={state.product} />;
}

function ProductFormFields({ mode, product }: { mode: "create" | "edit"; product?: ApiProduct }) {
  const router = useRouter();
  const { logout } = useAdminSession();
  const [b2bAvailable, setB2bAvailable] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [status, setStatus] = useState<ProductStatusCode>(product?.status ?? "ACTIVE");
  const [variants, setVariants] = useState<VariantRow[]>(() => initialAttributes(product));
  // Saved details first, then the preset labels the product doesn't have yet (left empty).
  const [specs, setSpecs] = useState<SpecRow[]>(() => withPresetDetails(product?.specifications ?? []).map((row) => ({ key: newKey(), ...row })));
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");
  const uploading = variants.some((row) => row.photos.some((photo) => photo.uploading));
  // The API allows 20 images per product, counting every attribute's photos.
  const imageCount = variants.reduce((sum, row) => sum + row.photos.length, 0);

  useEffect(() => {
    const controller = new AbortController();
    listAdminCategories(getSessionToken() ?? "", controller.signal)
      .then(setCategories)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) return logout();
        setCategoriesError(error instanceof ApiError ? error.message : "Couldn't load categories.");
      });
    return () => controller.abort();
  }, [logout]);

  function clearFieldError(field: Field) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    clearFieldError("variants");
  }

  function updatePhotos(key: string, change: (photos: ImageRow[]) => ImageRow[]) {
    setVariants((rows) => rows.map((row) => (row.key === key ? { ...row, photos: change(row.photos) } : row)));
  }

  // Each file is checked, shown as a local preview, uploaded, then switched to the stored copy's URL,
  // so the preview proves the API has the file. Failed uploads are removed and reported.
  async function uploadVariantPhotos(key: string, files: File[]) {
    const problems: string[] = [];
    const accepted = files.filter((file) => {
      const problem = imageFileProblem(file);
      if (problem) problems.push(problem);
      return !problem;
    });
    const room = MAX_IMAGES - imageCount;
    if (accepted.length > room) {
      problems.push(`A product can have up to ${MAX_IMAGES} photos across all its attributes.`);
      accepted.splice(Math.max(room, 0));
    }
    setFieldErrors((prev) => ({ ...prev, variants: problems.join(" ") || undefined }));
    if (!accepted.length) return;

    const pending: ImageRow[] = accepted.map((file) => ({
      key: newKey(),
      mediaId: null,
      url: URL.createObjectURL(file),
      altText: "",
      isPrimary: false,
      uploading: true,
      filename: file.name,
    }));
    updatePhotos(key, (photos) => [...photos, ...pending]);

    const token = getSessionToken() ?? "";
    await Promise.all(
      pending.map(async (row, index) => {
        const file = accepted[index];
        try {
          const media = await uploadMedia(token, file);
          updatePhotos(key, (photos) => photos.map((p) => (p.key === row.key ? { ...p, mediaId: media.id, url: media.url, uploading: false } : p)));
        } catch (error) {
          const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Upload failed.");
          if (apiError.status === 401) return logout();
          updatePhotos(key, (photos) => photos.filter((p) => p.key !== row.key));
          setFieldErrors((prev) => ({ ...prev, variants: [prev.variants, uploadErrorMessage(file, apiError)].filter(Boolean).join(" ") }));
        } finally {
          if (row.url) URL.revokeObjectURL(row.url);
        }
      })
    );
  }

  function validate(form: FormData) {
    const errors: FieldErrors = {};
    const text = (key: string) => String(form.get(key) ?? "").trim();

    const trimmedName = name.trim();
    if (!trimmedName) errors.name = "Enter a product name.";
    else if (trimmedName.length > MAX_TEXT) errors.name = `Use ${MAX_TEXT} characters or fewer.`;

    const normalizedSlug = toSlug(slug);
    if (!normalizedSlug) errors.slug = "Enter a URL handle using letters or numbers.";
    else if (normalizedSlug.length > MAX_TEXT) errors.slug = `Use ${MAX_TEXT} characters or fewer.`;

    const description = text("description");
    if (description.length > MAX_DESCRIPTION) errors.description = `Use ${MAX_DESCRIPTION.toLocaleString()} characters or fewer.`;

    const features = linesOf(String(form.get("features") ?? ""));
    errors.features = listProblem(features, "features");

    // Preset rows left without a value aren't saved.
    const details = detailsToSave(specs);
    const specifications = details.rows;
    if (details.error) errors.specifications = details.error;
    else if (specifications.length > MAX_SPECS) errors.specifications = `Add up to ${MAX_SPECS} rows with values.`;
    else if (specifications.some((row) => row.label.length > MAX_SPEC_LABEL || row.value.length > MAX_SPEC_VALUE)) errors.specifications = `Labels can be up to ${MAX_SPEC_LABEL} characters and values up to ${MAX_SPEC_VALUE}.`;

    const warranty = text("warranty");
    if (warranty.length > MAX_POLICY) errors.warranty = `Use ${MAX_POLICY.toLocaleString()} characters or fewer.`;
    // The Disclaimer tab's text is stored in the product's returnPolicy column (the per-product return policy is no longer edited).
    const disclaimer = text("disclaimer");
    if (disclaimer.length > MAX_POLICY) errors.returnPolicy = `Use ${MAX_POLICY.toLocaleString()} characters or fewer.`;

    if (!categoryId) errors.categoryId = "Select a category.";

    // Attributes: each one's SKU, prices, stock and photos.
    const variantInputs: ProductVariantInput[] = [];
    const totalsInput: { status: string; price: number; compareAtPrice?: number; stock: number }[] = [];
    const seenSkus = new Set<string>();
    const seenNames = new Set<string>();
    if (!variants.length) errors.variants = "Add at least one attribute: it holds the product's price, stock and photos.";
    else if (uploading) errors.variants = "Wait for the photos to finish uploading.";
    else if (variants.some((row) => row.photos.some((photo) => !photo.mediaId))) errors.variants = "Remove the external image (not stored by Chamaro) and upload a replacement.";
    else if (imageCount > MAX_IMAGES) errors.variants = `A product can have up to ${MAX_IMAGES} photos across all its attributes.`;
    for (const row of errors.variants ? [] : variants) {
      const colour = row.colour.trim();
      const variantSku = row.sku.trim();
      const label = variantName({ colour, other: row.other }) || "This attribute";
      const priceValue = row.price.trim();
      const compareValue = row.compareAtPrice.trim();
      const stockValue = row.stock.trim();
      let problem: string | undefined;
      if (!colour || colour.length > MAX_TEXT) problem = "Each attribute needs a colour name (up to 191 characters).";
      else if (seenNames.has(label.toLowerCase())) problem = `"${label}" is listed twice.`;
      else if (label.length > MAX_TEXT) problem = `"${label}" is too long; shorten the colour or extra options.`;
      else if (!variantSku || variantSku.length > MAX_TEXT) problem = `"${label}" needs a SKU (up to 191 characters).`;
      else if (seenSkus.has(variantSku.toLowerCase())) problem = `SKU "${variantSku}" is used twice.`;
      else if (!priceValue || !PRICE_PATTERN.test(priceValue) || Number(priceValue) > MAX_PRICE) problem = `Enter a price for "${label}" (0 or more, at most 2 decimals).`;
      else if (compareValue && (!PRICE_PATTERN.test(compareValue) || Number(compareValue) > MAX_PRICE)) problem = `Enter a valid compare-at price for "${label}", or leave it empty.`;
      else if (compareValue && Number(compareValue) < Number(priceValue)) problem = `The compare-at price of "${label}" must be at least its price.`;
      else if (!/^\d+$/.test(stockValue) || Number(stockValue) > MAX_QUANTITY) problem = `Enter the stock of "${label}" as a whole number (0 or more).`;
      const options = problem
        ? null
        : toVariantOptions({
            colour,
            hex: row.hex,
            other: row.other,
            imageIds: row.photos.map((photo) => photo.mediaId!),
            ...(compareValue ? { compareAtPrice: Number(compareValue) } : {}),
            stock: Number(stockValue),
          });
      if (!problem && !options) problem = `Write the extra options for "${label}" as Name: Value, e.g. Size: L.`;
      if (problem) {
        errors.variants = problem;
        break;
      }
      seenSkus.add(variantSku.toLowerCase());
      seenNames.add(label.toLowerCase());
      variantInputs.push({ name: label, sku: variantSku, options: options!, status: row.status, price: Number(priceValue) });
      totalsInput.push({
        status: row.status,
        price: Number(priceValue),
        ...(compareValue ? { compareAtPrice: Number(compareValue) } : {}),
        stock: Number(stockValue),
      });
    }

    // Every attribute's photos are the product's images; the first one is the listing image.
    const imageInputs: ProductImageInput[] = variants
      .flatMap((row) => row.photos)
      .filter((photo) => photo.mediaId)
      .map((photo, position) => ({
        mediaId: photo.mediaId!,
        position,
        isPrimary: position === 0,
        ...(photo.altText.trim() ? { altText: photo.altText.trim() } : {}),
      }));

    // The product row's own price, compare-at price and stock come from the attributes.
    const totals = productTotals(totalsInput);
    const input: CreateProductInput = {
      name: trimmedName,
      slug: normalizedSlug,
      price: totals.price,
      categoryId,
      status,
      // On edit an empty description clears it; the other optional fields can only be set.
      ...(description || product?.description ? { description } : {}),
      // Always sent, so clearing them in the form clears them in the storefront.
      features,
      specifications,
      returnPolicy: disclaimer,
      warranty,
      // The API can't remove a compare-at price once set; one equal to the price is never shown.
      ...(totals.compareAtPrice !== undefined ? { compareAtPrice: totals.compareAtPrice } : product?.compareAtPrice != null ? { compareAtPrice: totals.price } : {}),
      quantity: totals.quantity,
      // PUT replaces images and variants wholesale; both are always sent so they stay in step.
      images: imageInputs,
      variants: variantInputs,
    };
    return { errors, input };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;

    const { errors, input } = validate(new FormData(e.currentTarget));
    setFieldErrors(errors);
    setFormError(null);
    if (Object.values(errors).some(Boolean)) {
      setFormError("Fix the highlighted fields and try again.");
      return;
    }

    setPhase("saving");
    try {
      const token = getSessionToken() ?? "";
      const saved = product ? await updateAdminProduct(token, product.id, input) : await createAdminProduct(token, input);
      setPhase("saved");
      router.push(`/products?${product ? "updated" : "created"}=${encodeURIComponent(saved.name)}`);
    } catch (error) {
      setPhase("idle");
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't save the product. Please try again.");
      switch (apiError.status) {
        case 401:
          logout();
          return;
        case 400:
          // The API reports only a generic "Request validation failed" (no per-field detail),
          // except for the compare-at price rule, which has its own message.
          if (apiError.message.includes("compareAtPrice")) {
            setFieldErrors({ variants: "The first attribute's compare-at price must be at least its price." });
            setFormError("Fix the highlighted fields and try again.");
          } else {
            setFormError(`The server rejected these product details: ${apiError.message}.`);
          }
          return;
        case 404:
          if (apiError.message === "Category not found") {
            setFieldErrors({ categoryId: "This category no longer exists. Select another one." });
            setFormError("Fix the highlighted fields and try again.");
          } else {
            setFormError("This product no longer exists. It may have been deleted.");
          }
          return;
        case 409:
          // A unique constraint failed; the API doesn't say which one.
          setFieldErrors({
            slug: "This URL handle may already be used by another product.",
            variants: "An attribute SKU may already be used by another product.",
          });
          setFormError("Another record already uses this URL handle or one of these SKUs.");
          return;
      }
      setFormError(apiError.message);
    }
  }

  const saving = phase === "saving";
  const saveLabel =
    phase === "saving" ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving...
      </>
    ) : phase === "saved" ? (
      <>
        <CheckCircle2 className="h-4 w-4" />
        Saved
      </>
    ) : (
      "Save Product"
    );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <PageHeader
        title={mode === "create" ? "Add Product" : `Edit ${product?.name ?? "Product"}`}
        description={mode === "create" ? "Create a new product listing." : "Update product details."}
        actions={
          <>
            <Link href="/products">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={phase !== "idle" || uploading}>
              {saveLabel}
            </Button>
          </>
        }
      />

      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{formError}</p>
        </div>
      )}
      {phase === "saved" && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{mode === "create" ? "Product created." : "Product updated."} Returning to Products...</p>
        </div>
      )}

      <fieldset disabled={saving} className="rounded-lg border border-zinc-200 bg-white px-5">
        <FormSection title="Product information" description="Basic details customers will see.">
          <Input
            label="Product name"
            name="name"
            placeholder="e.g. Elegant Boss Chair"
            value={name}
            maxLength={MAX_TEXT}
            error={fieldErrors.name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
              if (!slugEdited) {
                setSlug(toSlug(e.target.value));
                clearFieldError("slug");
              }
            }}
            required
          />
          <Input
            label="URL handle"
            name="slug"
            placeholder="e.g. elegant-boss-chair"
            value={slug}
            maxLength={MAX_TEXT}
            hint={
              mode === "create"
                ? "Used in the product URL. Filled in from the name; lowercase letters, numbers and dashes."
                : "Used in the product URL. Changing it breaks existing links to this product."
            }
            error={fieldErrors.slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
              clearFieldError("slug");
            }}
            onBlur={() => setSlug((value) => toSlug(value))}
            required
          />
        </FormSection>

        <FormSection
          title="Product page tabs"
          description="The Description, Features, Additional Information, Warranty and Disclaimer tabs on the product page."
        >
          <Textarea
            label="Description"
            name="description"
            placeholder="Describe the product..."
            defaultValue={product?.description ?? ""}
            maxLength={MAX_DESCRIPTION}
            error={fieldErrors.description}
          />
          <Textarea
            label="Features"
            name="features"
            placeholder={"Breathable mesh back\nAdjustable lumbar support"}
            defaultValue={(product?.features ?? []).join("\n")}
            hint="One per line."
            error={fieldErrors.features}
            onChange={() => clearFieldError("features")}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Additional information</span>
            <ul className="flex flex-col gap-2">
              {specs.map((row, index) => {
                const cell = "h-9 min-w-0 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10";
                const update = (patch: Partial<SpecRow>) => {
                  setSpecs((rows) => rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)));
                  clearFieldError("specifications");
                };
                return (
                  <li key={row.key} className="flex items-center gap-2">
                    <input aria-label={`Detail ${index + 1} label`} placeholder="Label, e.g. Seat height" value={row.label} maxLength={MAX_SPEC_LABEL} onChange={(e) => update({ label: e.target.value })} className={cn(cell, "w-2/5 shrink-0 bg-zinc-50 font-medium")} />
                    <input aria-label={`${row.label || `Detail ${index + 1}`} value`} placeholder="Value" value={row.value} maxLength={MAX_SPEC_VALUE} onChange={(e) => update({ value: e.target.value })} className={cn(cell, "flex-1")} />
                    <button
                      type="button"
                      aria-label={`Remove ${row.label || `detail ${index + 1}`}`}
                      onClick={() => {
                        setSpecs((rows) => rows.filter((r) => r.key !== row.key));
                        clearFieldError("specifications");
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {fieldErrors.specifications ? (
              <p className="text-xs text-red-600">{fieldErrors.specifications}</p>
            ) : (
              <p className="text-xs text-zinc-500">Fill in the values that apply; rows left empty aren&apos;t shown. Add your own rows for anything else. The SKU is added automatically.</p>
            )}
            <div>
              <Button
                type="button"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                disabled={specs.length >= MAX_SPECS}
                onClick={() => setSpecs((rows) => [...rows, { key: newKey(), label: "", value: "" }])}
              >
                Add detail
              </Button>
            </div>
          </div>

          <Textarea
            label="Warranty"
            name="warranty"
            defaultValue={product?.warranty ?? ""}
            maxLength={MAX_POLICY}
            hint="Leave empty to show the store's standard warranty."
            error={fieldErrors.warranty}
            onChange={() => clearFieldError("warranty")}
          />
          <Textarea
            label="Disclaimer"
            name="disclaimer"
            defaultValue={product?.returnPolicy ?? ""}
            maxLength={MAX_POLICY}
            hint="Leave empty to show the store's standard disclaimer."
            error={fieldErrors.returnPolicy}
            onChange={() => clearFieldError("returnPolicy")}
          />
        </FormSection>

        <FormSection
          title="Attributes"
          description={`Each attribute is one colour of the product, sold with its own SKU, price, stock and photos; customers pick it from the colour swatches. The first active attribute's price and photo are shown in product listings, and the product's stock is the total of its active attributes.${
            product?.inventory?.reservedQuantity ? ` ${product.inventory.reservedQuantity} unit(s) are reserved in open carts/orders.` : ""
          }`}
        >
          {variants.length > 0 && (
            <ul className="flex flex-col gap-3">
              {variants.map((row, index) => (
                <ColourVariantCard
                  key={row.key}
                  index={index}
                  row={row}
                  productName={name}
                  canAddPhotos={imageCount < MAX_IMAGES}
                  canRemove={variants.length > 1}
                  onChange={(patch) => updateVariant(row.key, patch)}
                  onPhotos={(change) => updatePhotos(row.key, change)}
                  onUpload={(files) => uploadVariantPhotos(row.key, files)}
                  onRemove={() => {
                    setVariants((rows) => rows.filter((r) => r.key !== row.key));
                    clearFieldError("variants");
                  }}
                />
              ))}
            </ul>
          )}
          {fieldErrors.variants && (
            <p role="alert" className="text-xs text-red-600">
              {fieldErrors.variants}
            </p>
          )}
          <div>
            <Button
              type="button"
              variant="secondary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setVariants((rows) => [...rows, blankAttribute()])}
            >
              Add attribute
            </Button>
          </div>
        </FormSection>

        <FormSection title="Organization" description="Categorize and set visibility. Only Active products appear in the storefront.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              name="categoryId"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                clearFieldError("categoryId");
              }}
              error={fieldErrors.categoryId ?? categoriesError ?? undefined}
            >
              <option value="">{categories ? "Select a category" : "Loading categories..."}</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status !== "ACTIVE" ? ` (${c.status.toLowerCase()})` : ""}
                </option>
              ))}
            </Select>
            <Select label="Status" name="status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatusCode)}>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
        </FormSection>

        <FormSection
          title="Sales channels"
          description="Control where this product can be purchased. B2B pricing is UI preparation only — the final pricing model has not been decided yet. These settings are not saved yet."
        >
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="retailAvailable" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
              Available for retail (website storefront)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="b2bAvailable"
                checked={b2bAvailable}
                onChange={(e) => setB2bAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Available for B2B / wholesale enquiries
            </label>
          </div>

          {b2bAvailable && (
            <div className="grid grid-cols-1 gap-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 sm:grid-cols-2">
              <Input label="Minimum order quantity (MOQ)" name="moq" type="number" min="1" placeholder="e.g. 50" />
              <Input
                label="B2B pricing"
                name="b2bPricingNote"
                placeholder="Contact for quotation"
                hint="Mock field — pricing model to be finalized."
                defaultValue="Contact for quotation"
              />
            </div>
          )}
        </FormSection>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Link href="/products">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <Button type="submit" variant="primary" disabled={phase !== "idle" || uploading}>
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
