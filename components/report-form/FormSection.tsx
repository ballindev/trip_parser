import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
  disabled = false,
  disabledMessage,
}: {
  title: string;
  description: string;
  children: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  return (
    <section
      className={`grid grid-cols-1 gap-4 border-b border-edge py-5 last:border-b-0 md:grid-cols-[188px_minmax(0,1fr)] md:gap-0 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="md:pr-5">
        <h3 className="text-[15px] font-bold leading-6 text-ink">
          {title}
        </h3>
        <p className="mt-1.5 text-[12px] leading-5 text-ink-subtle">
          {description}
        </p>
      </div>
      <div className="min-w-0 md:border-l md:border-edge md:pl-5">
        {disabled ? (
          <div className="rounded-xl border border-dashed border-edge-strong bg-surface-subtle px-4 py-5">
            <p className="text-[13px] font-semibold text-ink-subtle">
              {disabledMessage ?? "이 항목은 현재 사용할 수 없습니다."}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-[13px] text-ink-subtle">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}
