"use client";

import { useEffect, useState } from "react";
import { formatDisplayDate, parseDisplayDate } from "@/lib/format";

export type TripFormValues = {
  name: string;
  summary: string;
  startDate: string;
  endDate: string;
};

type TripDurationMode = "sameDay" | "range";

type TripFormDialogProps = {
  mode: "create" | "edit";
  initialValues: TripFormValues;
  onConfirm: (values: TripFormValues) => void;
  onCancel: () => void;
};

const inputClassName =
  "w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15";

function resolveDurationMode(
  startDate: string,
  endDate: string,
): TripDurationMode {
  return startDate && endDate && startDate === endDate ? "sameDay" : "range";
}

function DateYmdInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (isoDate: string) => void;
}) {
  const [text, setText] = useState(formatDisplayDate(value));

  useEffect(() => {
    setText(formatDisplayDate(value));
  }, [value]);

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="YYYY.MM.DD"
        className={inputClassName}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const parsed = parseDisplayDate(next);
          if (parsed) onChange(parsed);
        }}
        onBlur={() => {
          const parsed = parseDisplayDate(text);
          if (parsed) {
            setText(formatDisplayDate(parsed));
            onChange(parsed);
            return;
          }
          setText(formatDisplayDate(value));
        }}
      />
      {min ? (
        <span className="sr-only">최소일: {formatDisplayDate(min)}</span>
      ) : null}
    </div>
  );
}

export function TripFormDialog({
  mode,
  initialValues,
  onConfirm,
  onCancel,
}: TripFormDialogProps) {
  const [name, setName] = useState(initialValues.name);
  const [summary, setSummary] = useState(initialValues.summary);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [durationMode, setDurationMode] = useState<TripDurationMode>(
    resolveDurationMode(initialValues.startDate, initialValues.endDate),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setName(initialValues.name);
    setSummary(initialValues.summary);
    setStartDate(initialValues.startDate);
    setEndDate(initialValues.endDate);
    setDurationMode(
      resolveDurationMode(initialValues.startDate, initialValues.endDate),
    );
    setError("");
  }, [initialValues]);

  const handleDurationModeChange = (nextMode: TripDurationMode) => {
    setDurationMode(nextMode);
    setError("");

    if (nextMode === "sameDay" && startDate) {
      setEndDate(startDate);
    }
  };

  const handleConfirm = () => {
    const trimmedName = name.trim();
    const trimmedSummary = summary.trim();
    const resolvedEndDate = durationMode === "sameDay" ? startDate : endDate;

    if (!trimmedName) {
      setError("출장명을 입력해 주세요.");
      return;
    }

    if (!trimmedSummary) {
      setError("계정과목(적요)을 입력해 주세요.");
      return;
    }

    if (!startDate || !parseDisplayDate(formatDisplayDate(startDate))) {
      setError(
        durationMode === "sameDay"
          ? "출장일을 YYYY.MM.DD 형식으로 입력해 주세요."
          : "시작일을 YYYY.MM.DD 형식으로 입력해 주세요.",
      );
      return;
    }

    if (
      durationMode === "range" &&
      (!resolvedEndDate || !parseDisplayDate(formatDisplayDate(resolvedEndDate)))
    ) {
      setError("종료일을 YYYY.MM.DD 형식으로 입력해 주세요.");
      return;
    }

    if (resolvedEndDate < startDate) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    onConfirm({
      name: trimmedName,
      summary: trimmedSummary,
      startDate,
      endDate: resolvedEndDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-form-title"
        className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
      >
        <h3
          id="trip-form-title"
          className="text-[17px] font-bold text-[#191F28]"
        >
          {mode === "create" ? "출장 추가" : "출장 수정"}
        </h3>
        <p className="mt-1 text-[13px] text-[#8B95A1]">
          출장 정보와 일정을 입력해 주세요.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
              출장명
            </label>
            <input
              autoFocus
              className={inputClassName}
              value={name}
              placeholder="예: 부산 물류센터 점검"
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
              계정과목 (적요)
            </label>
            <input
              className={inputClassName}
              value={summary}
              placeholder="예: 물류 자동화 설비 현황 점검"
              onChange={(e) => {
                setSummary(e.target.value);
                setError("");
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
              일정 유형
            </label>
            <div className="flex rounded-xl bg-[#F2F4F6] p-1">
              {(
                [
                  { value: "sameDay", label: "당일" },
                  { value: "range", label: "기간" },
                ] as const
              ).map((option) => {
                const selected = durationMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDurationModeChange(option.value)}
                    className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
                      selected
                        ? "bg-white text-[#3182F6] shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                        : "text-[#8B95A1] hover:text-[#4E5968]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {durationMode === "sameDay" ? (
            <DateYmdInput
              label="출장일"
              value={startDate}
              onChange={(nextDate) => {
                setStartDate(nextDate);
                setEndDate(nextDate);
                setError("");
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <DateYmdInput
                label="시작일"
                value={startDate}
                onChange={(nextDate) => {
                  setStartDate(nextDate);
                  setError("");
                }}
              />
              <DateYmdInput
                label="종료일"
                value={endDate}
                min={startDate}
                onChange={(nextDate) => {
                  setEndDate(nextDate);
                  setError("");
                }}
              />
            </div>
          )}

          {error ? (
            <p className="text-[13px] font-medium text-[#F04452]">{error}</p>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-[#3182F6] px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#1B64DA]"
          >
            확인
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
