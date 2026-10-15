import { DatePicker } from "@/components/DatePicker";
import { rebuildDailyHours } from "@/lib/daily-hours";
import { rebuildDailyMeals } from "@/lib/daily-meals";
import type { ReportForm } from "@/lib/types";
import { FormSection } from "./FormSection";

type ScheduleSectionProps = {
  form: ReportForm;
  onChange: (next: ReportForm) => void;
};

export function ScheduleSection({ form, onChange }: ScheduleSectionProps) {
  return (
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
  );
}
