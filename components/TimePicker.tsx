"use client";

import { useEffect, useId, useRef, useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = ["00", "10", "20", "30", "40", "50"] as const;

function parseTime(value: string): { hour: string; minute: string } | null {
  const matched = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) return null;
  const hour = matched[1].padStart(2, "0");
  const minute = matched[2];
  if (!HOURS.includes(hour)) return null;
  if ((MINUTES as readonly string[]).includes(minute)) {
    return { hour, minute };
  }
  const minuteNum = Number(minute);
  if (Number.isNaN(minuteNum)) return null;
  const snapped = String(
    Math.min(50, Math.round(minuteNum / 10) * 10),
  ).padStart(2, "0");
  return { hour, minute: snapped };
}

function formatTime(hour: string, minute: string): string {
  return `${hour}:${minute}`;
}

type TimePickerProps = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
};

export function TimePicker({
  label,
  value,
  onChange,
  placeholder = "--:--",
  className = "",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  const [draftHour, setDraftHour] = useState(parsed?.hour ?? "09");
  const [draftMinute, setDraftMinute] = useState(parsed?.minute ?? "00");
  const rootRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const current = parseTime(value);
    setDraftHour(current?.hour ?? "09");
    setDraftMinute(current?.minute ?? "00");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const scrollSelected = (
      container: HTMLDivElement | null,
      selected: string,
    ) => {
      if (!container) return;
      const el = container.querySelector<HTMLElement>(
        `[data-value="${selected}"]`,
      );
      el?.scrollIntoView({ block: "center" });
    };

    const frame = window.requestAnimationFrame(() => {
      scrollSelected(hourListRef.current, draftHour);
      scrollSelected(minuteListRef.current, draftMinute);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, draftHour, draftMinute]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const commit = (nextHour: string, nextMinute: string) => {
    onChange(formatTime(nextHour, nextMinute));
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label className="mb-1.5 block text-center text-[12px] font-semibold text-[#8B95A1]">
          {label}
        </label>
      ) : null}

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-center gap-1 rounded-xl border px-3 text-[14px] font-semibold tabular-nums outline-none transition ${
          open
            ? "border-[#3182F6] bg-white ring-2 ring-[#3182F6]/15"
            : "border-[#E5E8EB] bg-[#F9FAFB] hover:bg-white"
        }`}
      >
        <span className={parsed ? "text-[#191F28]" : "text-[#8B95A1]"}>
          {parsed ? `${parsed.hour}:${parsed.minute}` : placeholder}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label ?? "시간 선택"}
          className="absolute left-1/2 top-[calc(100%+8px)] z-[60] w-[200px] -translate-x-1/2 rounded-2xl border border-[#E5E8EB] bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
        >
          <p className="mb-2 text-center text-[12px] font-semibold text-[#8B95A1]">
            스크롤해서 선택
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            <div>
              <p className="mb-1 text-center text-[11px] font-bold text-[#8B95A1]">
                시
              </p>
              <div
                ref={hourListRef}
                className="h-[168px] overflow-y-auto rounded-xl bg-[#F9FAFB] py-1 [scrollbar-width:thin]"
              >
                {HOURS.map((item) => {
                  const selected = draftHour === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      data-value={item}
                      onClick={() => {
                        setDraftHour(item);
                        commit(item, draftMinute);
                      }}
                      className={`flex w-full items-center justify-center py-2 text-[14px] font-semibold tabular-nums transition-colors ${
                        selected
                          ? "bg-[#E8F3FF] text-[#3182F6]"
                          : "text-[#4E5968] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center pb-1 pt-5 text-[16px] font-bold text-[#8B95A1]">
              :
            </div>

            <div>
              <p className="mb-1 text-center text-[11px] font-bold text-[#8B95A1]">
                분
              </p>
              <div
                ref={minuteListRef}
                className="h-[168px] overflow-y-auto rounded-xl bg-[#F9FAFB] py-1 [scrollbar-width:thin]"
              >
                {MINUTES.map((item) => {
                  const selected = draftMinute === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      data-value={item}
                      onClick={() => {
                        setDraftMinute(item);
                        commit(draftHour, item);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-center py-2 text-[14px] font-semibold tabular-nums transition-colors ${
                        selected
                          ? "bg-[#E8F3FF] text-[#3182F6]"
                          : "text-[#4E5968] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              commit(draftHour, draftMinute);
              setOpen(false);
            }}
            className="mt-3 w-full rounded-xl bg-[#3182F6] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1B64DA]"
          >
            확인
          </button>
        </div>
      ) : null}
    </div>
  );
}
