import { cn } from "@/lib/utils";

type Tone = "green" | "zinc" | "red" | "amber" | "blue" | "purple";

const toneClasses: Record<Tone, string> = {
  green: "bg-green-50 text-green-700 ring-green-600/20",
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

const statusToneMap: Record<string, Tone> = {
  Active: "green",
  Paid: "green",
  Completed: "green",
  Converted: "green",
  Draft: "zinc",
  Inactive: "zinc",
  Closed: "zinc",
  Pending: "amber",
  Confirmed: "blue",
  Processing: "blue",
  Shipped: "blue",
  "Quotation Sent": "blue",
  New: "blue",
  Contacted: "amber",
  "Requirement Received": "amber",
  Negotiating: "amber",
  "Out of stock": "red",
  Cancelled: "red",
  Failed: "red",
  Refunded: "zinc",
  Retail: "blue",
  B2B: "purple",
};

interface StatusBadgeProps {
  status: string;
  tone?: Tone;
}

export function StatusBadge({ status, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? statusToneMap[status] ?? "zinc";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[resolvedTone]
      )}
    >
      {status}
    </span>
  );
}
