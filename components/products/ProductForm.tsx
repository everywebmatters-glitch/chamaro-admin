"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Plus, SearchX, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { listAdminCategories, type ApiCategory } from "@/lib/api/categories";
import { IMAGE_ACCEPT, imageFileProblem, uploadMedia } from "@/lib/api/media";
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

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
}

type Field = "name" | "slug" | "description" | "features" | "materials" | "specifications" | "returnPolicy" | "warranty" | "price" | "compareAtPrice" | "sku" | "quantity" | "categoryId" | "images" | "variants";
type FieldErrors = Partial<Record<Field, string>>;

interface ImageRow {
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

interface VariantRow {
  key: string;
  name: string;
  sku: string;
  price: string;
  options: string; // "Colour: Black, Size: L"
  status: ProductStatusCode;
}

// Limits mirror the product body schema in backend/src/routes/product.routes.ts and the Prisma columns behind it.
const MAX_TEXT = 191;
const MAX_DESCRIPTION = 50000;
const MAX_ALT_TEXT = 500;
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

function priceText(value: string | null | undefined): string {
  return value == null ? "" : Number(value).toFixed(2);
}

function optionsToText(options: Record<string, unknown>): string {
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function parseOptions(text: string): Record<string, string> | null {
  const options: Record<string, string> = {};
  for (const part of text.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [key, ...rest] = part.split(":");
    const value = rest.join(":").trim();
    if (!key.trim() || !value) return null;
    options[key.trim()] = value;
  }
  return options;
}

// Exactly one primary image whenever there are images.
function withPrimary(rows: ImageRow[]): ImageRow[] {
  if (!rows.length || rows.some((row) => row.isPrimary)) return rows;
  return rows.map((row, index) => ({ ...row, isPrimary: index === 0 }));
}

function uploadErrorMessage(file: File, error: ApiError): string {
  if (error.status === 413) return `“${file.name}” is larger than 5 MB.`;
  if (error.status === 415) return `“${file.name}” isn't a JPEG, PNG or WebP image.`;
  return `Couldn't upload “${file.name}”: ${error.message}`;
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
  const [images, setImages] = useState<ImageRow[]>(
    [...(product?.images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({ key: image.id, mediaId: image.mediaId, url: image.url, altText: image.altText ?? "", isPrimary: image.isPrimary }))
  );
  const [imagesDirty, setImagesDirty] = useState(false);
  const uploading = images.some((row) => row.uploading);
  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.variants ?? []).map((v) => ({
      key: v.id,
      name: v.name,
      sku: v.sku,
      price: priceText(v.price),
      options: optionsToText(v.options),
      status: v.status,
    }))
  );
  const [variantsDirty, setVariantsDirty] = useState(false);
  const [specs, setSpecs] = useState<SpecRow[]>((product?.specifications ?? []).map((spec) => ({ key: newKey(), ...spec })));
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");

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

  function updateImages(next: ImageRow[]) {
    setImages(next);
    setImagesDirty(true);
    clearFieldError("images");
  }

  // Each file is checked, shown as a local preview, uploaded, then switched to the stored copy's URL,
  // so the preview proves the API has the file. Failed uploads are removed and reported.
  async function uploadFiles(files: File[]) {
    const problems: string[] = [];
    const accepted = files.filter((file) => {
      const problem = imageFileProblem(file);
      if (problem) problems.push(problem);
      return !problem;
    });
    const room = MAX_IMAGES - images.length;
    if (accepted.length > room) {
      problems.push(`A product can have up to ${MAX_IMAGES} images.`);
      accepted.splice(Math.max(room, 0));
    }
    setFieldErrors((prev) => ({ ...prev, images: problems.join(" ") || undefined }));
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
    setImages((rows) => withPrimary([...rows, ...pending]));
    setImagesDirty(true);

    const token = getSessionToken() ?? "";
    await Promise.all(
      pending.map(async (row, index) => {
        const file = accepted[index];
        try {
          const media = await uploadMedia(token, file);
          setImages((rows) => rows.map((r) => (r.key === row.key ? { ...r, mediaId: media.id, url: media.url, uploading: false } : r)));
        } catch (error) {
          const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Upload failed.");
          if (apiError.status === 401) return logout();
          setImages((rows) => withPrimary(rows.filter((r) => r.key !== row.key)));
          setFieldErrors((prev) => ({ ...prev, images: [prev.images, uploadErrorMessage(file, apiError)].filter(Boolean).join(" ") }));
        } finally {
          if (row.url) URL.revokeObjectURL(row.url);
        }
      })
    );
  }

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setVariantsDirty(true);
    clearFieldError("variants");
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
    const materials = linesOf(String(form.get("materials") ?? ""));
    errors.materials = listProblem(materials, "materials");

    // Rows left completely empty are ignored; half-filled rows are an error.
    const specifications = specs.map((row) => ({ label: row.label.trim(), value: row.value.trim() })).filter((row) => row.label || row.value);
    if (specifications.some((row) => !row.label || !row.value)) errors.specifications = "Each row needs both a label and a value.";
    else if (specifications.length > MAX_SPECS) errors.specifications = `Add up to ${MAX_SPECS} rows.`;
    else if (specifications.some((row) => row.label.length > MAX_SPEC_LABEL || row.value.length > MAX_SPEC_VALUE)) errors.specifications = `Labels can be up to ${MAX_SPEC_LABEL} characters and values up to ${MAX_SPEC_VALUE}.`;

    const returnPolicy = text("returnPolicy");
    if (returnPolicy.length > MAX_POLICY) errors.returnPolicy = `Use ${MAX_POLICY.toLocaleString()} characters or fewer.`;
    const warranty = text("warranty");
    if (warranty.length > MAX_POLICY) errors.warranty = `Use ${MAX_POLICY.toLocaleString()} characters or fewer.`;

    const priceValue = text("price");
    const price = Number(priceValue);
    if (!priceValue) errors.price = "Enter a price.";
    else if (!PRICE_PATTERN.test(priceValue) || price > MAX_PRICE) errors.price = "Enter a price of 0 or more with at most 2 decimals.";

    const compareValue = text("compareAtPrice");
    const compareAtPrice = Number(compareValue);
    if (compareValue) {
      if (!PRICE_PATTERN.test(compareValue) || compareAtPrice > MAX_PRICE) errors.compareAtPrice = "Enter a price of 0 or more with at most 2 decimals.";
      else if (!errors.price && compareAtPrice < price) errors.compareAtPrice = "Must be greater than or equal to the price.";
    } else if (product?.compareAtPrice != null) {
      errors.compareAtPrice = "The API can't remove a compare-at price once set. Enter a value.";
    }

    const sku = text("sku");
    if (sku.length > MAX_TEXT) errors.sku = `Use ${MAX_TEXT} characters or fewer.`;
    else if (!sku && product?.sku) errors.sku = "The API can't remove a SKU once set. Enter a value.";

    const quantityValue = text("stock");
    if (quantityValue && (!/^\d+$/.test(quantityValue) || Number(quantityValue) > MAX_QUANTITY)) errors.quantity = "Enter a whole number of 0 or more.";
    else if (!quantityValue && product?.inventory) errors.quantity = "The API can't stop tracking stock once set. Enter a quantity.";

    if (!categoryId) errors.categoryId = "Select a category.";

    // Only uploaded images can be saved. A legacy external image is kept as long as the images
    // aren't changed; once they are, the admin must remove it (the API no longer accepts URLs).
    const imagesWillBeSent = mode === "create" || imagesDirty;
    const imageInputs: ProductImageInput[] = images
      .filter((image) => image.mediaId)
      .map((image, position) => ({
        mediaId: image.mediaId!,
        position,
        isPrimary: image.isPrimary,
        ...(image.altText.trim() ? { altText: image.altText.trim() } : {}),
      }));
    if (uploading) errors.images = "Wait for the images to finish uploading.";
    else if (imagesWillBeSent && images.some((image) => !image.mediaId)) errors.images = "Remove the external image before saving image changes. Upload a replacement instead.";
    else if (images.some((image) => image.altText.trim().length > MAX_ALT_TEXT)) errors.images = `Alt text must be ${MAX_ALT_TEXT} characters or fewer.`;

    const variantInputs: ProductVariantInput[] = [];
    const seenSkus = new Set<string>();
    for (const row of variants) {
      const variantName = row.name.trim();
      const variantSku = row.sku.trim();
      const options = parseOptions(row.options);
      const variantPrice = row.price.trim();
      let problem: string | undefined;
      if (!variantName || variantName.length > MAX_TEXT) problem = "Each variant needs a name (up to 191 characters).";
      else if (!variantSku || variantSku.length > MAX_TEXT) problem = "Each variant needs a SKU (up to 191 characters).";
      else if (seenSkus.has(variantSku.toLowerCase())) problem = `Variant SKU "${variantSku}" is used twice.`;
      else if (!options) problem = `Write options for "${variantName}" as Name: Value, separated by commas.`;
      else if (variantPrice && (!PRICE_PATTERN.test(variantPrice) || Number(variantPrice) > MAX_PRICE)) problem = `Enter a valid price for "${variantName}", or leave it empty.`;
      if (problem) {
        errors.variants = problem;
        break;
      }
      seenSkus.add(variantSku.toLowerCase());
      variantInputs.push({
        name: variantName,
        sku: variantSku,
        options: options!,
        status: row.status,
        ...(variantPrice ? { price: Number(variantPrice) } : {}),
      });
    }

    const input: CreateProductInput = {
      name: trimmedName,
      slug: normalizedSlug,
      price,
      categoryId,
      status,
      // On edit an empty description clears it; the other optional fields can only be set.
      ...(description || product?.description ? { description } : {}),
      // Always sent, so clearing them in the form clears them in the storefront.
      features,
      materials,
      specifications,
      returnPolicy,
      warranty,
      ...(compareValue ? { compareAtPrice } : {}),
      ...(sku ? { sku } : {}),
      ...(quantityValue ? { quantity: Number(quantityValue) } : {}),
      // PUT replaces images/variants wholesale, so only send them when they were changed.
      ...(mode === "create" ? (imageInputs.length ? { images: imageInputs } : {}) : imagesDirty ? { images: imageInputs } : {}),
      ...(mode === "create" ? (variantInputs.length ? { variants: variantInputs } : {}) : variantsDirty ? { variants: variantInputs } : {}),
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
            setFieldErrors({ compareAtPrice: "Must be greater than or equal to the price." });
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
            ...(input.sku ? { sku: "This SKU may already be used by another product." } : {}),
            ...(input.variants?.length ? { variants: "A variant SKU may already be used by another product." } : {}),
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
            placeholder="e.g. Classic Cotton T-Shirt"
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
            placeholder="e.g. classic-cotton-t-shirt"
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
          <Textarea
            label="Description"
            name="description"
            placeholder="Describe the product..."
            defaultValue={product?.description ?? ""}
            maxLength={MAX_DESCRIPTION}
            error={fieldErrors.description}
          />
        </FormSection>

        <FormSection
          title="Product page tabs"
          description="Content for the storefront's Description, Additional Information, Return Policies and Warranty tabs."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea
              label="Features"
              name="features"
              placeholder={"Breathable mesh back\nAdjustable lumbar support"}
              defaultValue={(product?.features ?? []).join("\n")}
              hint="One per line. Shown in the Description tab."
              error={fieldErrors.features}
              onChange={() => clearFieldError("features")}
            />
            <Textarea
              label="Materials"
              name="materials"
              placeholder={"Nylon base\nHigh-density foam"}
              defaultValue={(product?.materials ?? []).join("\n")}
              hint="One per line. Shown in the Description tab."
              error={fieldErrors.materials}
              onChange={() => clearFieldError("materials")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Additional information</span>
            {specs.length > 0 && (
              <ul className="flex flex-col gap-2">
                {specs.map((row, index) => {
                  const cell = "h-9 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10";
                  const update = (patch: Partial<SpecRow>) => {
                    setSpecs((rows) => rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)));
                    clearFieldError("specifications");
                  };
                  return (
                    <li key={row.key} className="flex items-center gap-2">
                      <input aria-label={`Detail ${index + 1} label`} placeholder="e.g. Seat height" value={row.label} maxLength={MAX_SPEC_LABEL} onChange={(e) => update({ label: e.target.value })} className={cn(cell, "sm:w-2/5")} />
                      <input aria-label={`Detail ${index + 1} value`} placeholder="e.g. 45–55 cm" value={row.value} maxLength={MAX_SPEC_VALUE} onChange={(e) => update({ value: e.target.value })} className={cell} />
                      <button
                        type="button"
                        aria-label={`Remove detail ${index + 1}`}
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
            )}
            {fieldErrors.specifications ? (
              <p className="text-xs text-red-600">{fieldErrors.specifications}</p>
            ) : (
              <p className="text-xs text-zinc-500">Label and value pairs such as dimensions, weight capacity or assembly. The SKU is added automatically.</p>
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
            label="Return policy"
            name="returnPolicy"
            defaultValue={product?.returnPolicy ?? ""}
            maxLength={MAX_POLICY}
            hint="Leave empty to show the store's standard return policy."
            error={fieldErrors.returnPolicy}
            onChange={() => clearFieldError("returnPolicy")}
          />
          <Textarea
            label="Warranty"
            name="warranty"
            defaultValue={product?.warranty ?? ""}
            maxLength={MAX_POLICY}
            hint="Leave empty to show the store's standard warranty."
            error={fieldErrors.warranty}
            onChange={() => clearFieldError("warranty")}
          />
        </FormSection>

        <FormSection
          title="Media"
          description="Images are uploaded to Chamaro and stored in its database. The primary image is shown in product listings."
        >
          {images.length > 0 && (
            <ul className="flex flex-col gap-2">
              {images.map((image, index) => (
                <li key={image.key} className="flex items-center gap-3 rounded-md border border-zinc-200 p-2">
                  <ImagePreview src={image.url} label={image.altText || name} size="md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {image.uploading ? (
                      <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {image.filename}...
                      </p>
                    ) : image.mediaId ? (
                      <p className="truncate text-xs text-zinc-500">{image.filename ?? "Stored image"}</p>
                    ) : (
                      <p className="truncate text-xs text-amber-600" title={image.url ?? undefined}>
                        External image (not stored by Chamaro). It can&apos;t be kept if you change images; upload a replacement.
                      </p>
                    )}
                    <input
                      aria-label={`Alt text for image ${index + 1}`}
                      placeholder="Alt text (describes the image)"
                      value={image.altText}
                      maxLength={MAX_ALT_TEXT}
                      onChange={(e) => updateImages(images.map((row) => (row.key === image.key ? { ...row, altText: e.target.value } : row)))}
                      className="h-8 w-full rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={image.uploading}
                    onClick={() => updateImages(images.map((row) => ({ ...row, isPrimary: row.key === image.key })))}
                    aria-pressed={image.isPrimary}
                    title={image.isPrimary ? "Primary image" : "Make primary"}
                    className={cn(
                      "flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium",
                      image.isPrimary ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
                    )}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {image.isPrimary ? "Primary" : "Make primary"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove image ${index + 1}`}
                    disabled={image.uploading}
                    onClick={() => updateImages(withPrimary(images.filter((row) => row.key !== image.key)))}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fieldErrors.images && (
            <p role="alert" className="text-xs text-red-600">
              {fieldErrors.images}
            </p>
          )}
          {images.length < MAX_IMAGES && (
            <ImageUploader
              label={images.length ? "Add more images" : "Product images"}
              aspect="wide"
              multiple
              accept={IMAGE_ACCEPT}
              formats="JPEG, PNG or WebP, up to 5 MB each"
              busy={uploading}
              onFiles={uploadFiles}
            />
          )}
        </FormSection>

        <FormSection title="Pricing" description="Set the price customers will pay.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              defaultValue={priceText(product?.price)}
              error={fieldErrors.price}
              onChange={() => clearFieldError("price")}
              required
            />
            <Input
              label="Compare-at price"
              name="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              hint="Optional. Shown as a strikethrough price."
              defaultValue={priceText(product?.compareAtPrice)}
              error={fieldErrors.compareAtPrice}
              onChange={() => clearFieldError("compareAtPrice")}
            />
          </div>
        </FormSection>

        <FormSection title="Inventory" description="Track stock for this product.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="SKU"
              name="sku"
              placeholder="e.g. TS-CL-001"
              defaultValue={product?.sku ?? ""}
              maxLength={MAX_TEXT}
              hint="Optional. Must be unique."
              error={fieldErrors.sku}
              onChange={() => clearFieldError("sku")}
            />
            <Input
              label="Stock quantity"
              name="stock"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              defaultValue={product?.inventory?.quantity ?? ""}
              hint={
                product?.inventory
                  ? `${product.inventory.reservedQuantity} reserved in open carts/orders.`
                  : "Optional. Leave empty to skip inventory tracking."
              }
              error={fieldErrors.quantity}
              onChange={() => clearFieldError("quantity")}
            />
          </div>
        </FormSection>

        <FormSection
          title="Variants"
          description="Optional. Options are written as Name: Value pairs, e.g. Colour: Black, Size: L. Leave a variant's price empty to use the product price."
        >
          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500">
                    <th className="pb-1.5 pr-2 font-medium">Name</th>
                    <th className="pb-1.5 pr-2 font-medium">SKU</th>
                    <th className="pb-1.5 pr-2 font-medium">Price</th>
                    <th className="pb-1.5 pr-2 font-medium">Options</th>
                    <th className="pb-1.5 pr-2 font-medium">Status</th>
                    <th className="pb-1.5">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((row, index) => {
                    const cell = "h-8 w-full rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10";
                    return (
                      <tr key={row.key}>
                        <td className="py-1 pr-2">
                          <input aria-label={`Variant ${index + 1} name`} value={row.name} maxLength={MAX_TEXT} onChange={(e) => updateVariant(row.key, { name: e.target.value })} className={cell} />
                        </td>
                        <td className="py-1 pr-2">
                          <input aria-label={`Variant ${index + 1} SKU`} value={row.sku} maxLength={MAX_TEXT} onChange={(e) => updateVariant(row.key, { sku: e.target.value })} className={cell} />
                        </td>
                        <td className="w-28 py-1 pr-2">
                          <input aria-label={`Variant ${index + 1} price`} type="number" step="0.01" min="0" value={row.price} onChange={(e) => updateVariant(row.key, { price: e.target.value })} className={cell} />
                        </td>
                        <td className="py-1 pr-2">
                          <input aria-label={`Variant ${index + 1} options`} placeholder="Colour: Black" value={row.options} onChange={(e) => updateVariant(row.key, { options: e.target.value })} className={cell} />
                        </td>
                        <td className="w-28 py-1 pr-2">
                          <select aria-label={`Variant ${index + 1} status`} value={row.status} onChange={(e) => updateVariant(row.key, { status: e.target.value as ProductStatusCode })} className={cell}>
                            <option value="ACTIVE">Active</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </td>
                        <td className="py-1">
                          <button
                            type="button"
                            aria-label={`Remove variant ${index + 1}`}
                            onClick={() => {
                              setVariants((rows) => rows.filter((r) => r.key !== row.key));
                              setVariantsDirty(true);
                              clearFieldError("variants");
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {fieldErrors.variants && <p className="text-xs text-red-600">{fieldErrors.variants}</p>}
          <div>
            <Button
              type="button"
              variant="secondary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setVariants((rows) => [...rows, { key: newKey(), name: "", sku: "", price: "", options: "", status: "ACTIVE" }]);
                setVariantsDirty(true);
              }}
            >
              Add variant
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
