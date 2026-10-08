import type { WriteStatus } from "@/lib/types";

const STATUS_STYLES: Record<WriteStatus, string> = {
  미작성: "bg-[#F2F4F6] text-[#4E5968]",
  작성중: "bg-[#E8F3FF] text-[#3182F6]",
  완료: "bg-[#E8F8F0] text-[#03B26C]",
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
