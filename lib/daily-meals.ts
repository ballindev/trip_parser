import type { DailyMeal } from "@/lib/types";

function emptyMeal(date: string): DailyMeal {
  return {
    date,
    breakfast: false,
    lunch: false,
    dinner: false,
  };
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
