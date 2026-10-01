import type { ComponentType } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, change, trend, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">{label}</span>
        <span className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</span>
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
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100">
        <Icon className="h-[18px] w-[18px] text-zinc-600" />
      </div>
    </div>
  );
}
