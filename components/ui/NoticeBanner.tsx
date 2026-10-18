import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export type Notice = { tone: "success" | "error"; text: string };

export function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const success = notice.tone === "success";
  const Icon = success ? CheckCircle2 : AlertTriangle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={
        success
          ? "flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
          : "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{notice.text}</p>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className={success ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
