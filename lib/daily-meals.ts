import { isNonWorkingDay } from "@/lib/calendar";
import {
  needsWeekdayMorningChoice,
  rangeIncludesTime,
  timeToMinutes,
} from "@/lib/daily-hours";
import type { DailyMeal, DailyWorkHours } from "@/lib/types";

function emptyMeal(date: string): DailyMeal {
  return {
    date,
    breakfast: false,
    lunch: false,
    dinner: false,
  };
}

export type MealEligibility = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

const MEAL_ANCHORS = [
  { key: "breakfast" as const, time: "09:00" },
  { key: "lunch" as const, time: "12:00" },
  { key: "dinner" as const, time: "18:00" },
];

/** 12:00 미만(오전) 식사 시각 — 평일 시간외수당 선택 시 식비 미지급 */
const MORNING_MEAL_CUTOFF_MINUTES = 12 * 60;

/**
 * 근무시간·요일·오전 청구방식 기준으로 식비 지급 대상 식사를 계산합니다.
 *
 * 평일
 * - 08:00~ : 시간외수당 선택 시 조식 제외(중·석만) / 조식 선택 시 조·중·석
 * - 08:20~ 등 08:00 초과 시작: 선택 없이 포함 시각 기준 조·중·석
 *
 * 주말·공휴일
 * - 09:00 포함 시 조식 무조건 포함 (시간외수당은 별도, 선택 UI 없음)
 */
export function eligibleMeals(
  day: DailyWorkHours | undefined | null,
): MealEligibility {
  if (!day?.startTime?.trim() || !day?.endTime?.trim()) {
    return { breakfast: false, lunch: false, dinner: false };
  }

  const nonWorking = Boolean(day.date && isNonWorkingDay(day.date));
  const weekdayMorningChoice =
    !nonWorking &&
    needsWeekdayMorningChoice(day.startTime, day.endTime);
  const choseWeekdayOvertime =
    weekdayMorningChoice && day.morningClaim === "overtime";
  const choseWeekdayBreakfast =
    weekdayMorningChoice && day.morningClaim === "breakfast";

  const result: MealEligibility = {
    breakfast: false,
    lunch: false,
    dinner: false,
  };

  for (const meal of MEAL_ANCHORS) {
    if (!rangeIncludesTime(day.startTime, day.endTime, meal.time)) {
      continue;
    }

    const mealMinutes = timeToMinutes(meal.time);
    // 평일 + 시간외수당: 오전(12:00 미만) 식사 제외
    if (
      choseWeekdayOvertime &&
      mealMinutes !== null &&
      mealMinutes < MORNING_MEAL_CUTOFF_MINUTES
    ) {
      continue;
    }

    if (meal.key === "breakfast") {
      if (weekdayMorningChoice) {
        result.breakfast = choseWeekdayBreakfast;
      } else {
        // 주말·공휴일 또는 평일 08:00 초과 시작 → 09:00 포함 시 조식 지급
        result.breakfast = true;
      }
      continue;
    }

    result[meal.key] = true;
  }

  return result;
}

/** 식비 지급 대상 식사 수 (사추비 제외 전) */
export function countEligibleMeals(day: DailyWorkHours | undefined | null): number {
  const eligible = eligibleMeals(day);
  return (
    Number(eligible.breakfast) +
    Number(eligible.lunch) +
    Number(eligible.dinner)
  );
}

export function buildDailyMeals(
  startDate: string,
  endDate: string,
): DailyMeal[] {
  if (!startDate || !endDate || endDate < startDate) return [];

  const days: DailyMeal[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    days.push(emptyMeal(`${year}-${month}-${day}`));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function rebuildDailyMeals(
  startDate: string,
  endDate: string,
  previous: DailyMeal[],
): DailyMeal[] {
  const previousByDate = new Map(previous.map((item) => [item.date, item]));
  return buildDailyMeals(startDate, endDate).map((item) => {
    const prev = previousByDate.get(item.date);
    if (!prev) return item;
    return {
      date: item.date,
      breakfast: prev.breakfast,
      lunch: prev.lunch,
      dinner: prev.dinner,
    };
  });
}

export function formatMealSummary(meals: DailyMeal[]): string {
  const counts = meals.reduce(
    (acc, item) => {
      if (item.breakfast) acc.breakfast += 1;
      if (item.lunch) acc.lunch += 1;
      if (item.dinner) acc.dinner += 1;
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0 },
  );

  if (
    counts.breakfast === 0 &&
    counts.lunch === 0 &&
    counts.dinner === 0
  ) {
    return "미선택";
  }

  return `조${counts.breakfast} · 중${counts.lunch} · 석${counts.dinner}`;
}
