"use client";

import { useId, useState } from "react";
import { UploadCloud, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  label?: string;
  hint?: string;
  aspect?: "square" | "wide";
  // When set, chosen files are handed to the caller (which uploads them). Without it the uploader
  // is UI-only: it just shows the chosen filename (used by forms not yet connected to the API).
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  formats?: string;
  busy?: boolean;
  disabled?: boolean;
}

export function ImageUploader({
  label = "Image",
  hint,
  aspect = "square",
  onFiles,
  multiple = false,
  accept = "image/*",
  formats = "PNG, JPG up to 5MB",
  busy = false,
  disabled = false,
}: ImageUploaderProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  const inactive = disabled || busy;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-zinc-700">{label}</span>}
      <label
        htmlFor={inputId}
        aria-disabled={inactive}
        className={cn(
          "group flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-center transition-colors",
          inactive ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-zinc-400 hover:bg-zinc-100",
          aspect === "square" ? "aspect-square max-w-xs" : "aspect-[21/9] w-full"
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" aria-hidden="true" />
            <span className="text-sm font-medium text-zinc-600">Uploading...</span>
          </>
        ) : fileName && !onFiles ? (
          <>
            <ImageIcon className="h-6 w-6 text-zinc-400" aria-hidden="true" />
            <span className="max-w-[80%] truncate text-sm text-zinc-600">{fileName}</span>
            <span className="text-xs text-zinc-400">Click to replace</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-zinc-400" aria-hidden="true" />
            <span className="text-sm font-medium text-zinc-600">{multiple ? "Click to upload images" : "Click to upload an image"}</span>
            <span className="text-xs text-zinc-400">{formats}</span>
          </>
        )}
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={inactive}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (onFiles) {
              if (files.length) onFiles(files);
              // Allow choosing the same file again after a failed upload.
              e.target.value = "";
            } else {
              setFileName(files[0]?.name ?? null);
            }
          }}
        />
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
