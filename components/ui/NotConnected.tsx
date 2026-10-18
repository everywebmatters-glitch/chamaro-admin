import { PlugZap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface NotConnectedProps {
  title: string;
  description: string;
  // What is missing, in plain words, so it's clear this is not an empty database.
  missing: string;
}

// Placeholder for screens whose backend endpoints don't exist yet. It shows no data at all, so nothing
// here can be mistaken for real orders, customers or settings.
export function NotConnected({ title, description, missing }: NotConnectedProps) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} />
      <EmptyState icon={PlugZap} title="Not connected to the API yet" description={missing} />
    </div>
  );
}
