import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center"
    >
      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden="true" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export function TableSkeletonRow({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        </td>
      ))}
    </tr>
  );
}
