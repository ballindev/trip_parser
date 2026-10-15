import { TimePicker } from "@/components/TimePicker";
import {
  formatWorkDuration,
  formatWorkHours,
  isInvalidWorkTimeRange,
  needsMorningClaim,
  requiresMorningClaimSelection,
  showsWeekendMorningInfo,
  withUpdatedDayTimes,
} from "@/lib/daily-hours";
import { formatDisplayDate } from "@/lib/format";
import type { MorningClaim, ReportForm } from "@/lib/types";
import { FormSection } from "./FormSection";

type DailyHoursSectionProps = {
  form: ReportForm;
  onChange: (next: ReportForm) => void;
};

export function DailyHoursSection({ form, onChange }: DailyHoursSectionProps) {
  return (
    <FormSection
      title="3. 날짜별 근무시간"
      description="출장 일정의 날짜별로 업무시작·마감을 선택하면 근무시간이 자동 계산됩니다. 평일은 08:00 이전 시작 시 시간외수당/조식 중 하나를 선택해 주세요. 주말·공휴일은 09:00 근무 포함 시 시간외수당과 조식 모두 지급 가능합니다."
    >
      {form.dailyHours.length === 0 ? (
        <div className="rounded-xl bg-surface-subtle px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-ink-subtle">
            표시할 날짜가 없습니다
          </p>
          <p className="mt-1 text-[12px] text-ink-subtle">
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
            const showMorningClaim = needsMorningClaim(
              item.startTime,
              item.endTime,
              item.date,
            );
            const showWeekendInfo = showsWeekendMorningInfo(
              item.startTime,
              item.endTime,
              item.date,
            );
            const morningChoiceRequired = requiresMorningClaimSelection(
              item.startTime,
              item.endTime,
              item.date,
            );

            return (
              <div
                key={item.date}
                className="space-y-2 rounded-2xl bg-surface-subtle p-3"
              >
                <div className="grid items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)_108px]">
                  <div>
                    <p className="mb-1.5 text-center text-[12px] font-semibold text-ink-subtle">
                      날짜
                    </p>
                    <div
                      aria-readonly="true"
                      title="출장 일정에서 자동으로 채워진 날짜입니다"
                      className="flex h-11 select-none items-center justify-center rounded-xl bg-surface-inset px-3 text-center text-[13px] font-semibold tabular-nums text-ink-subtle"
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
                    <p className="mb-1.5 text-center text-[12px] font-semibold text-ink-subtle">
                      업무시간
                    </p>
                    <div
                      className={`flex h-11 items-center justify-center rounded-xl px-2 ${
                        invalidRange ? "bg-danger-soft" : "bg-selected"
                      }`}
                    >
                      {invalidRange ? (
                        <p className="text-center text-[12px] font-bold leading-4 text-danger">
                          시간 수정
                          <br />
                          필요
                        </p>
                      ) : (
                        <p className="text-center text-[14px] font-bold tabular-nums text-accent">
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

                {showWeekendInfo ? (
                  <div className="rounded-xl border border-edge-selected bg-selected px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-accent">
                      주말·공휴일
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-ink-subtle">
                      시간외수당과 조식 모두 지급 가능합니다. (조식은
                      09:00 근무 포함 시 자동 반영)
                    </p>
                  </div>
                ) : null}

                {showMorningClaim ? (
                  <div className="rounded-xl border border-edge-selected bg-selected px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-accent">
                      오전 08:00~09:00 청구 방식
                      {morningChoiceRequired && !item.morningClaim ? (
                        <span className="ml-1 font-bold text-danger">
                          (필수)
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {(
                        [
                          {
                            value: "overtime" as MorningClaim,
                            label: "시간외수당",
                          },
                          {
                            value: "breakfast" as MorningClaim,
                            label: "조식",
                          },
                        ] as const
                      ).map((option) => {
                        const selected =
                          item.morningClaim === option.value;
                        return (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <input
                              type="radio"
                              name={`morning-claim-${item.date}`}
                              checked={selected}
                              onChange={() => {
                                const nextHours = [...form.dailyHours];
                                nextHours[index] = withUpdatedDayTimes(
                                  item,
                                  { morningClaim: option.value },
                                );
                                onChange({
                                  ...form,
                                  dailyHours: nextHours,
                                });
                              }}
                              className="h-4 w-4 accent-accent"
                            />
                            <span className="text-[13px] font-semibold text-ink-subtle">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
