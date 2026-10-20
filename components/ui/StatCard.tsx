import type { ComponentType } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  // Neutral supporting text (use `change` only for a real up/down movement).
  note?: string;
  icon: ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, change, trend, note, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-zinc-500 sm:text-sm">{label}</span>
        <span className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{value}</span>
        {note && <span className="text-xs text-zinc-500">{note}</span>}
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend === "down" ? "text-red-600" : "text-green-600"
            )}
          >
            {trend === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" />
            )}
            {change}
          </span>
        )}
      </div>
      {/* Hidden on phones, where the cards sit two or three to a row. */}
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 sm:flex">
        <Icon className="h-[18px] w-[18px] text-zinc-600" />
      </div>
    </div>
  );
}
