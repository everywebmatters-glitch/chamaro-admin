import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
        <Icon className="h-5 w-5 text-zinc-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        {description && <p className="text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
