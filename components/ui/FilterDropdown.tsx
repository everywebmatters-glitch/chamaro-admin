"use client";

import { ChevronDown } from "lucide-react";

// A plain string is both the value and the label; use { value, label } when they differ (e.g. an ID).
type FilterOption = string | { value: string; label: string };

interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-md border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-700 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
      >
        <option value="">{label}</option>
        {options.map((option) => {
          const { value: optionValue, label: optionLabel } = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      />
    </div>
  );
}
