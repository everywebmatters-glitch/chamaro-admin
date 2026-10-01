"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveApiUrl } from "@/lib/api/client";

interface ImagePreviewProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  // Image URL from the API (root-relative API paths are resolved) or a blob: preview.
  // Missing or unloadable URLs show the placeholder.
  src?: string | null;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-full w-full",
};

export function ImagePreview({ label, className, size = "sm", src: rawSrc }: ImagePreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = rawSrc ? resolveApiUrl(rawSrc) : rawSrc;
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 text-zinc-300",
        sizeClasses[size],
        className
      )}
      title={label}
    >
      {showImage ? (
        // Product images are arbitrary external URLs, so next/image (which needs allow-listed hosts) isn't used.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={label ?? ""} className="h-full w-full object-cover" onError={() => setFailedSrc(src!)} />
      ) : (
        <ImageIcon className={size === "sm" ? "h-4 w-4" : "h-6 w-6"} aria-hidden="true" />
      )}
    </div>
  );
}
