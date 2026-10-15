import type { WriteStatus } from "@/lib/types";

const STATUS_STYLES: Record<WriteStatus, string> = {
  미작성: "bg-surface-muted text-ink-secondary",
  작성중: "bg-selected-hover text-accent",
  완료: "bg-success-soft text-success",
};

export function StatusBadge({ status }: { status: WriteStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
