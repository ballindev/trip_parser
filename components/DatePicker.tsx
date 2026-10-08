"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@/lib/format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(iso: string): Date | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(viewMonth: Date): (Date | null)[] {
  const first = startOfMonth(viewMonth);
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const startWeekday = first.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type DatePickerProps = {
  label?: string;
  value: string;
  min?: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
};

export function DatePicker({
  label,
  value,
  min,
  onChange,
  placeholder = "날짜 선택",
  className = "",
  align = "left",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseIsoDate(value);
  const [viewMonth, setViewMonth] = useState(
    () => startOfMonth(selectedDate ?? new Date()),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const minDate = parseIsoDate(min ?? "");
  const todayIso = toIsoDate(new Date());

  useEffect(() => {
    if (!open) return;
    setViewMonth(startOfMonth(parseIsoDate(value) ?? new Date()));
  }, [open, value]);

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

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const monthLabel = `${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
          {label}
        </label>
      ) : null}

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3 py-2.5 text-left text-[14px] text-[#191F28] outline-none transition hover:bg-white focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15"
      >
        <span className={`min-w-0 truncate ${value ? "font-medium" : "text-[#8B95A1]"}`}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F6] text-[#4E5968]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="3.5"
              y="5.5"
              width="17"
              height="15"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M3.5 10.5h17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M8 3.5v3M16 3.5v3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="dialog"
          aria-label={label ?? "날짜 선택"}
          className={`absolute top-[calc(100%+8px)] z-[60] w-[288px] rounded-2xl border border-[#E5E8EB] bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.14)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => setViewMonth((current) => addMonths(current, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2F4F6] text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
            >
              ‹
            </button>
            <p className="text-[14px] font-bold text-[#191F28]">{monthLabel}</p>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => setViewMonth((current) => addMonths(current, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2F4F6] text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className={`py-1 text-center text-[11px] font-semibold ${
                  weekday === "일"
                    ? "text-[#F04452]"
                    : weekday === "토"
                      ? "text-[#3182F6]"
                      : "text-[#8B95A1]"
                }`}
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-9" />;
              }

              const iso = toIsoDate(day);
              const disabled = Boolean(minDate && day < minDate);
              const selected = value === iso;
              const isToday = iso === todayIso;
              const weekday = day.getDay();

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`flex h-9 w-full items-center justify-center rounded-xl text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    selected
                      ? "bg-[#3182F6] text-white shadow-[0_4px_12px_rgba(49,130,246,0.28)]"
                      : isToday
                        ? "bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E8F3FF]"
                        : weekday === 0
                          ? "text-[#F04452] hover:bg-[#F2F4F6]"
                          : weekday === 6
                            ? "text-[#3182F6] hover:bg-[#F2F4F6]"
                            : "text-[#191F28] hover:bg-[#F2F4F6]"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
