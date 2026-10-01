import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-6 border-b border-zinc-200 py-6 first:pt-0 last:border-b-0 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      <div className="flex flex-col gap-4 lg:col-span-2">{children}</div>
    </section>
  );
}
