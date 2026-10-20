"use client";

import { useId } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { IMAGE_ACCEPT } from "@/lib/api/media";
import type { ProductStatusCode } from "@/lib/api/products";
import { suggestedShade, variantName } from "@/lib/variant-form";
import type { ImageRow, VariantRow } from "./ProductForm";

const MAX_TEXT = 191;
const FALLBACK_SHADE = "#cccccc";

const field =
  "h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10";
const labelText = "text-xs font-medium text-zinc-600";

interface ColourVariantCardProps {
  index: number;
  row: VariantRow;
  productName: string;
  canAddPhotos: boolean;
  onChange: (patch: Partial<VariantRow>) => void;
  onPhotos: (change: (photos: ImageRow[]) => ImageRow[]) => void;
  onUpload: (files: File[]) => void;
  onRemove: () => void;
}

// One colour of a product: swatch, SKU, price, extra options, status and its own photos.
export function ColourVariantCard({ index, row, productName, canAddPhotos, onChange, onPhotos, onUpload, onRemove }: ColourVariantCardProps) {
  const id = useId();
  // The shade the storefront will show: the picked one, else the default for the colour name.
  const autoShade = suggestedShade(row.colour);
  const shade = row.hex || autoShade || FALLBACK_SHADE;
  const title = variantName({ colour: row.colour, other: row.other }) || `Colour ${index + 1}`;
  const uploading = row.photos.some((photo) => photo.uploading);

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex items-center gap-3">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-inner"
          style={{ background: shade }}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className={labelText}>Colour name</span>
          <input
            value={row.colour}
            maxLength={MAX_TEXT}
            placeholder="e.g. Beige"
            onChange={(e) => onChange({ colour: e.target.value })}
            className={field}
          />
        </label>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-shade`} className={labelText}>
            Swatch shade
          </label>
          <div className="flex h-9 items-center gap-2">
            <input
              id={`${id}-shade`}
              type="color"
              value={shade}
              onChange={(e) => onChange({ hex: e.target.value })}
              className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
            />
            <span className="truncate text-xs text-zinc-500">
              {row.hex ? (
                <>
                  {row.hex}{" "}
                  <button type="button" className="font-medium text-zinc-700 underline" onClick={() => onChange({ hex: "" })}>
                    Auto
                  </button>
                </>
              ) : autoShade ? (
                "Auto from the name"
              ) : (
                "Pick a shade"
              )}
            </span>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className={labelText}>SKU</span>
          <input
            value={row.sku}
            maxLength={MAX_TEXT}
            placeholder="e.g. EBC-BEIGE"
            onChange={(e) => onChange({ sku: e.target.value })}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelText}>Price</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={row.price}
            placeholder="Product price"
            onChange={(e) => onChange({ price: e.target.value })}
            className={field}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1">
          <span className={labelText}>Extra options (optional)</span>
          <input
            value={row.other}
            placeholder="e.g. Size: L"
            onChange={(e) => onChange({ other: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelText}>Status</span>
          <select
            value={row.status}
            onChange={(e) => onChange({ status: e.target.value as ProductStatusCode })}
            className={field}
          >
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelText}>Photos for this colour</span>
        <ul className="flex flex-wrap gap-2">
          {row.photos.map((photo, photoIndex) => (
            <li key={photo.key} className="relative">
              <ImagePreview src={photo.url} label={`${productName} – ${title}`} size="md" />
              {photo.uploading ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" aria-label="Uploading" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onPhotos((photos) => photos.filter((p) => p.key !== photo.key))}
                  aria-label={`Remove photo ${photoIndex + 1} of ${title}`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
          {canAddPhotos && (
            <li>
              <label
                htmlFor={`${id}-photos`}
                aria-disabled={uploading}
                className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-zinc-300 bg-white text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
                title="Add photos for this colour"
              >
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium">Add</span>
              </label>
              <input
                id={`${id}-photos`}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                disabled={uploading}
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) onUpload(files);
                  e.target.value = "";
                }}
              />
            </li>
          )}
        </ul>
        <p className="text-xs text-zinc-500">
          {row.photos.length
            ? "Shown instead of the main images when a customer picks this colour."
            : "None yet: the main product images are shown for this colour."}
        </p>
      </div>
    </li>
  );
}
