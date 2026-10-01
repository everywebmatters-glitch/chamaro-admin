import { salesOverview } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export function SalesChart() {
  const max = Math.max(...salesOverview.map((d) => d.value));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Sales overview</h2>
          <p className="text-xs text-zinc-500">Revenue for the last 7 days</p>
        </div>
        <span className="text-sm font-medium text-zinc-900">
          {formatCurrency(salesOverview.reduce((sum, d) => sum + d.value, 0))}
        </span>
      </div>
      <div className="flex h-48 items-end gap-3">
        {salesOverview.map((day) => (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-sm bg-zinc-900/90 transition-colors hover:bg-zinc-900"
              style={{ height: `${(day.value / max) * 100}%` }}
              title={`${day.label}: ${formatCurrency(day.value)}`}
            />
            <span className="text-xs text-zinc-400">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
