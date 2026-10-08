"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DatePicker } from "@/components/DatePicker";
import { SelectDropdown } from "@/components/SelectDropdown";
import { StatusBadge } from "@/components/StatusBadge";
import { TimePicker } from "@/components/TimePicker";
import {
  formatTotalWorkHours,
  formatWorkDuration,
  formatWorkHours,
  isInvalidWorkTimeRange,
  rebuildDailyHours,
  withUpdatedDayTimes,
} from "@/lib/daily-hours";
import {
  formatMealSummary,
  rebuildDailyMeals,
} from "@/lib/daily-meals";
import { formatCurrency, formatDateRange, formatDisplayDate } from "@/lib/format";
import { REGIONS } from "@/lib/regions";
import type { DailyMeal, Participant, ReportForm } from "@/lib/types";

const MEAL_OPTIONS: {
  key: keyof Pick<DailyMeal, "breakfast" | "lunch" | "dinner">;
  label: string;
}[] = [
  { key: "breakfast", label: "조식" },
  { key: "lunch", label: "중식" },
  { key: "dinner", label: "석식" },
];

type FormAlign = "left" | "center";

type ReportFormPanelProps = {
  participant: Participant | null;
  form: ReportForm | null;
  tripStartDate?: string;
  tripEndDate?: string;
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
    <section className="grid grid-cols-1 gap-4 border-b border-[#E5E8EB] py-5 last:border-b-0 md:grid-cols-[188px_minmax(0,1fr)] md:gap-0">
      <div className="md:pr-5">
        <h3 className="text-[15px] font-bold leading-6 text-[#191F28]">
          {title}
        </h3>
        <p className="mt-1.5 text-[12px] leading-5 text-[#8B95A1]">
          {description}
        </p>
      </div>
      <div className="min-w-0 md:border-l md:border-[#E5E8EB] md:pl-5">
        {children}
      </div>
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
  tripStartDate = "",
  tripEndDate = "",
  onChange,
}: ReportFormPanelProps) {
  const [formAlign, setFormAlign] = useState<FormAlign>("left");

  useEffect(() => {
    if (!participant || !form || !tripStartDate || !tripEndDate) return;
    if (form.startDate && form.endDate) return;

    const startDate = form.startDate || tripStartDate;
    const endDate = form.endDate || tripEndDate;
    const resolvedEnd = endDate < startDate ? startDate : endDate;

    onChange({
      ...form,
      startDate,
      endDate: resolvedEnd,
      dailyHours: rebuildDailyHours(startDate, resolvedEnd, form.dailyHours),
      dailyMeals: rebuildDailyMeals(startDate, resolvedEnd, form.dailyMeals),
    });
    // 일정 미입력 시에만 출장 목록 날짜로 채웁니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id, tripStartDate, tripEndDate, form?.startDate, form?.endDate]);

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

  const totalWorkHoursLabel = formatTotalWorkHours(form.dailyHours);
  const totalCost = form.transportCost + form.lodgingCost;

  return (
    <section className="flex h-full w-[70%] flex-1 flex-col bg-[#F2F4F6]">
      <header className="flex items-center justify-between border-b border-[#E5E8EB] bg-white px-6 py-4">
        <div>
          <p className="text-[13px] font-semibold text-[#8B95A1]">
            출장비 데이터 입력폼
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
          className={`flex w-full max-w-[1180px] items-start gap-6 ${
            formAlign === "center" ? "mx-auto" : "mr-auto"
          }`}
        >
          <div className="min-w-0 flex-1 rounded-2xl border border-[#E5E8EB] bg-white px-5">
            <FormSection
              title="1. 지역 선택"
              description="출장 지역(광역자치단체)을 선택합니다."
            >
              <SelectDropdown
                label="지역"
                value={form.region}
                options={REGIONS}
                placeholder="지역을 선택해 주세요"
                className="max-w-[220px]"
                onChange={(nextRegion) =>
                  onChange({ ...form, region: nextRegion })
                }
              />
            </FormSection>

            <FormSection
              title="2. 출장 일정"
              description="출장 목록의 일정이 기본으로 채워지며, 필요하면 수정할 수 있습니다."
            >
              <div className="flex flex-wrap items-end gap-3">
                <DatePicker
                  label="시작일"
                  value={form.startDate}
                  placeholder="시작일 선택"
                  className="w-[168px]"
                  onChange={(nextDate) => {
                    const endDate =
                      form.endDate && form.endDate >= nextDate
                        ? form.endDate
                        : nextDate;
                    onChange({
                      ...form,
                      startDate: nextDate,
                      endDate,
                      dailyHours: rebuildDailyHours(
                        nextDate,
                        endDate,
                        form.dailyHours,
                      ),
                      dailyMeals: rebuildDailyMeals(
                        nextDate,
                        endDate,
                        form.dailyMeals,
                      ),
                    });
                  }}
                />
                <DatePicker
                  label="종료일"
                  value={form.endDate}
                  min={form.startDate}
                  placeholder="종료일 선택"
                  className="w-[168px]"
                  onChange={(nextDate) => {
                    const startDate = form.startDate || nextDate;
                    const endDate =
                      nextDate < startDate ? startDate : nextDate;
                    onChange({
                      ...form,
                      startDate,
                      endDate,
                      dailyHours: rebuildDailyHours(
                        startDate,
                        endDate,
                        form.dailyHours,
                      ),
                      dailyMeals: rebuildDailyMeals(
                        startDate,
                        endDate,
                        form.dailyMeals,
                      ),
                    });
                  }}
                />
              </div>
            </FormSection>

            <FormSection
              title="3. 날짜별 근무시간"
              description="출장 일정의 날짜별로 업무시작·마감을 선택하면 근무시간이 자동 계산됩니다."
            >
              {form.dailyHours.length === 0 ? (
                <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-[#4E5968]">
                    표시할 날짜가 없습니다
                  </p>
                  <p className="mt-1 text-[12px] text-[#8B95A1]">
                    먼저 출장 일정의 시작일·종료일을 선택해 주세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.dailyHours.map((item, index) => {
                    const invalidRange = isInvalidWorkTimeRange(
                      item.startTime,
                      item.endTime,
                    );

                    return (
                      <div
                        key={item.date}
                        className="grid items-start gap-3 rounded-2xl bg-[#F9FAFB] p-3 sm:grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)_108px]"
                      >
                        <div>
                          <p className="mb-1.5 text-center text-[12px] font-semibold text-[#8B95A1]">
                            날짜
                          </p>
                          <div
                            aria-readonly="true"
                            title="출장 일정에서 자동으로 채워진 날짜입니다"
                            className="flex h-11 select-none items-center justify-center rounded-xl bg-[#EEF0F3] px-3 text-center text-[13px] font-semibold tabular-nums text-[#6B7684]"
                          >
                            {formatDisplayDate(item.date)}
                          </div>
                        </div>
                        <TimePicker
                          label="업무시작"
                          value={item.startTime}
                          placeholder="시작"
                          onChange={(startTime) => {
                            const nextHours = [...form.dailyHours];
                            nextHours[index] = withUpdatedDayTimes(item, {
                              startTime,
                            });
                            onChange({ ...form, dailyHours: nextHours });
                          }}
                        />
                        <TimePicker
                          label="업무마감"
                          value={item.endTime}
                          placeholder="마감"
                          onChange={(endTime) => {
                            const nextHours = [...form.dailyHours];
                            nextHours[index] = withUpdatedDayTimes(item, {
                              endTime,
                            });
                            onChange({ ...form, dailyHours: nextHours });
                          }}
                        />
                        <div>
                          <p className="mb-1.5 text-center text-[12px] font-semibold text-[#8B95A1]">
                            업무시간
                          </p>
                          <div
                            className={`flex h-11 items-center justify-center rounded-xl px-2 ${
                              invalidRange ? "bg-[#FFF5F6]" : "bg-[#F2F8FF]"
                            }`}
                          >
                            {invalidRange ? (
                              <p className="text-center text-[12px] font-bold leading-4 text-[#F04452]">
                                시간 수정
                                <br />
                                필요
                              </p>
                            ) : (
                              <p className="text-center text-[14px] font-bold tabular-nums text-[#3182F6]">
                                {item.startTime && item.endTime
                                  ? formatWorkDuration(
                                      item.startTime,
                                      item.endTime,
                                    )
                                  : formatWorkHours(item.hours)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>

            <FormSection
              title="4. 사업추진비 사용여부"
              description="출장 일정 날짜별로 조식·중식·석식 사용 여부를 선택합니다."
            >
              {form.dailyMeals.length === 0 ? (
                <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-[#4E5968]">
                    표시할 날짜가 없습니다
                  </p>
                  <p className="mt-1 text-[12px] text-[#8B95A1]">
                    먼저 출장 일정의 시작일·종료일을 선택해 주세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.dailyMeals.map((item, index) => (
                    <div
                      key={item.date}
                      className="grid items-center gap-3 rounded-2xl bg-[#F9FAFB] p-3 sm:grid-cols-[112px_minmax(0,1fr)]"
                    >
                      <div
                        aria-readonly="true"
                        title="출장 일정에서 자동으로 채워진 날짜입니다"
                        className="flex h-11 select-none items-center justify-center rounded-xl bg-[#EEF0F3] px-3 text-center text-[13px] font-semibold tabular-nums text-[#6B7684]"
                      >
                        {formatDisplayDate(item.date)}
                      </div>
                      <div className="flex flex-wrap items-center gap-5 px-1">
                        {MEAL_OPTIONS.map((option) => {
                          const checked = item[option.key];
                          return (
                            <label
                              key={option.key}
                              className="flex h-11 cursor-pointer items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const nextMeals = [...form.dailyMeals];
                                  nextMeals[index] = {
                                    ...item,
                                    [option.key]: !checked,
                                  };
                                  onChange({
                                    ...form,
                                    dailyMeals: nextMeals,
                                  });
                                }}
                                className="h-4 w-4 accent-[#3182F6]"
                              />
                              <span className="text-[14px] font-semibold text-[#4E5968]">
                                {option.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

          <aside className="sticky top-0 hidden w-[260px] shrink-0 xl:block">
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
                  label="지역"
                  value={form.region || "미입력"}
                />
                <SummaryRow
                  label="일정"
                  value={
                    form.startDate && form.endDate
                      ? formatDateRange(form.startDate, form.endDate)
                      : "미입력"
                  }
                />
                <SummaryRow
                  label="총 근무시간"
                  value={totalWorkHoursLabel}
                />
                <SummaryRow
                  label="사업추진비"
                  value={formatMealSummary(form.dailyMeals)}
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
