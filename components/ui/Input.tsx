import { type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, rightElement, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10",
              error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
              Boolean(rightElement) && "pr-9",
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
        {hint && !error && <p className="text-xs text-zinc-500">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="text-sm font-medium text-zinc-700" {...props} />;
}
