"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  // For APIs that don't report a total: overrides totalPages for the Next button and drops "of N".
  hasNextPage?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, hasNextPage }: PaginationProps) {
  const from = totalItems && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const to = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : undefined;
  const canGoNext = hasNextPage ?? page < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
      <p className="text-sm text-zinc-500">
        {totalItems !== undefined ? (
          <>
            Showing <span className="font-medium text-zinc-700">{from}</span>–
            <span className="font-medium text-zinc-700">{to}</span> of{" "}
            <span className="font-medium text-zinc-700">{totalItems}</span>
          </>
        ) : hasNextPage !== undefined ? (
          `Page ${page}`
        ) : (
          `Page ${page} of ${totalPages}`
        )}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-8 text-center text-sm text-zinc-600">{page}</span>
        <button
          type="button"
          onClick={() => onPageChange(hasNextPage !== undefined ? page + 1 : Math.min(totalPages, page + 1))}
          disabled={!canGoNext}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
