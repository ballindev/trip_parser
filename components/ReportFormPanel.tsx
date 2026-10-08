"use client";

import { useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDateRange, formatDisplayDate } from "@/lib/format";
import type { Participant, ReportForm } from "@/lib/types";

type FormAlign = "left" | "center";

type ReportFormPanelProps = {
  participant: Participant | null;
  form: ReportForm | null;
  onChange: (next: ReportForm) => void;
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E8EB] bg-white p-5">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-[#191F28]">{title}</h3>
        <p className="mt-1 text-[13px] text-[#8B95A1]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-[13px] text-[#8B95A1]">{label}</span>
      <span className="text-right text-[13px] font-semibold text-[#191F28]">
        {value}
      </span>
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15";

export function ReportFormPanel({
  participant,
  form,
  onChange,
}: ReportFormPanelProps) {
  const [formAlign, setFormAlign] = useState<FormAlign>("left");

  if (!participant || !form) {
    return (
      <section className="flex h-full w-[70%] flex-1 items-center justify-center bg-[#F2F4F6]">
        <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <p className="text-[15px] font-bold text-[#191F28]">
            참여자를 선택해 주세요
          </p>
          <p className="mt-2 text-[13px] text-[#8B95A1]">
            좌측에서 출장과 인원을 선택하면 복명서 입력폼이 표시됩니다.
          </p>
        </div>
      </section>
    );
  }

  const totalHours = form.dailyHours.reduce((sum, item) => sum + item.hours, 0);
  const totalCost = form.transportCost + form.lodgingCost;

  return (
    <section className="flex h-full w-[70%] flex-1 flex-col bg-[#F2F4F6]">
      <header className="flex items-center justify-between border-b border-[#E5E8EB] bg-white px-6 py-4">
        <div>
          <p className="text-[13px] font-semibold text-[#8B95A1]">
            출장복명서 상세
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#191F28]">
              {participant.name}
            </h2>
            <StatusBadge status={participant.status} />
          </div>
          <p className="mt-1 text-[13px] text-[#8B95A1]">
            {participant.department}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#8B95A1]">
              정렬
            </span>
            <div className="flex rounded-xl bg-[#F2F4F6] p-1">
              {(
                [
                  { value: "left", label: "왼쪽" },
                  { value: "center", label: "가운데" },
                ] as const
              ).map((option) => {
                const selected = formAlign === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormAlign(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
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
          <button
            type="button"
            className="rounded-xl bg-[#3182F6] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#1B64DA]"
          >
            임시 저장
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div
          className={`flex w-full max-w-[1080px] items-start gap-6 ${
            formAlign === "center" ? "mx-auto" : "mr-auto"
          }`}
        >
          <div className="w-full max-w-[720px] flex-1 space-y-4">
            <FormSection
              title="1. 장소 선택"
              description="출장 장소를 선택하거나 입력합니다. (추후 상세 스펙 반영)"
            >
              <FieldLabel>장소</FieldLabel>
              <input
                className={inputClassName}
                value={form.location}
                placeholder="예: 부산 신항 물류센터"
                onChange={(e) =>
                  onChange({ ...form, location: e.target.value })
                }
              />
            </FormSection>

            <FormSection
              title="2. 출장 일정"
              description="출장 시작일과 종료일을 입력합니다."
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>시작일</FieldLabel>
                  <input
                    type="date"
                    className={inputClassName}
                    value={form.startDate}
                    onChange={(e) =>
                      onChange({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>종료일</FieldLabel>
                  <input
                    type="date"
                    className={inputClassName}
                    value={form.endDate}
                    onChange={(e) =>
                      onChange({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="3. 날짜별 근무시간"
              description="일자별 근무시간을 입력합니다. (추후 상세 스펙 반영)"
            >
              <div className="space-y-2">
                {form.dailyHours.map((item, index) => (
                  <div
                    key={item.date}
                    className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3"
                  >
                    <div className="rounded-xl bg-[#F2F4F6] px-3.5 py-2.5 text-[14px] font-medium text-[#4E5968]">
                      {formatDisplayDate(item.date)}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={24}
                        className={`${inputClassName} pr-10`}
                        value={item.hours}
                        onChange={(e) => {
                          const nextHours = [...form.dailyHours];
                          nextHours[index] = {
                            ...item,
                            hours: Number(e.target.value),
                          };
                          onChange({ ...form, dailyHours: nextHours });
                        }}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8B95A1]">
                        시간
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="4. 사추비 사용여부"
              description="자가용 이용(사추비) 여부를 선택합니다."
            >
              <div className="flex gap-2">
                {[true, false].map((value) => {
                  const selected = form.usePrivateCar === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() =>
                        onChange({ ...form, usePrivateCar: value })
                      }
                      className={`min-w-[96px] rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-all ${
                        selected
                          ? "bg-[#3182F6] text-white"
                          : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                      }`}
                    >
                      {value ? "사용" : "미사용"}
                    </button>
                  );
                })}
              </div>
            </FormSection>

            <FormSection
              title="5. 비용 입력"
              description="교통비와 숙박비 합계를 입력합니다. (추후 상세 스펙 반영)"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>교통비 (원)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    className={inputClassName}
                    value={form.transportCost}
                    onChange={(e) =>
                      onChange({
                        ...form,
                        transportCost: Number(e.target.value),
                      })
                    }
                  />
                  <p className="mt-2 text-[12px] text-[#8B95A1]">
                    {formatCurrency(form.transportCost)}원
                  </p>
                </div>
                <div>
                  <FieldLabel>숙박비 (원)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    className={inputClassName}
                    value={form.lodgingCost}
                    onChange={(e) =>
                      onChange({
                        ...form,
                        lodgingCost: Number(e.target.value),
                      })
                    }
                  />
                  <p className="mt-2 text-[12px] text-[#8B95A1]">
                    {formatCurrency(form.lodgingCost)}원
                  </p>
                </div>
              </div>
            </FormSection>
          </div>

          <aside className="sticky top-0 hidden w-[280px] shrink-0 xl:block">
            <div className="rounded-2xl border border-[#E5E8EB] bg-white p-5">
              <p className="text-[13px] font-semibold text-[#8B95A1]">
                입력 요약
              </p>
              <h3 className="mt-1 text-[16px] font-bold text-[#191F28]">
                {participant.name}
              </h3>

              <div className="mt-4 divide-y divide-[#F2F4F6]">
                <SummaryRow
                  label="작성 상태"
                  value={participant.status}
                />
                <SummaryRow
                  label="장소"
                  value={form.location || "미입력"}
                />
                <SummaryRow
                  label="일정"
                  value={
                    form.startDate && form.endDate
                      ? formatDateRange(form.startDate, form.endDate)
                      : "미입력"
                  }
                />
                <SummaryRow label="총 근무시간" value={`${totalHours}시간`} />
                <SummaryRow
                  label="사추비"
                  value={form.usePrivateCar ? "사용" : "미사용"}
                />
                <SummaryRow
                  label="교통비"
                  value={`${formatCurrency(form.transportCost)}원`}
                />
                <SummaryRow
                  label="숙박비"
                  value={`${formatCurrency(form.lodgingCost)}원`}
                />
              </div>

              <div className="mt-4 rounded-xl bg-[#F2F8FF] px-3.5 py-3">
                <p className="text-[12px] font-semibold text-[#3182F6]">
                  비용 합계
                </p>
                <p className="mt-1 text-[20px] font-bold tracking-tight text-[#191F28]">
                  {formatCurrency(totalCost)}원
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
