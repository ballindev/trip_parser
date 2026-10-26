/** 연도 필터가 시작되는 해. 이후 해는 현재 연도까지 자동으로 늘어난다. */
export const TRIP_FILTER_YEAR_START = 2026;

export type TripPeriodValue = "all" | number;

export function tripFilterYears(now = new Date()): number[] {
  const end = Math.max(TRIP_FILTER_YEAR_START, now.getFullYear());
  return Array.from(
    { length: end - TRIP_FILTER_YEAR_START + 1 },
    (_, index) => TRIP_FILTER_YEAR_START + index,
  );
}

export function defaultTripFilterYear(now = new Date()): number {
  const year = now.getFullYear();
  return year >= TRIP_FILTER_YEAR_START ? year : TRIP_FILTER_YEAR_START;
}

export function defaultTripFilterMonth(): TripPeriodValue {
  return "all";
}

function isoDay(value: string): string {
  return value.slice(0, 10);
}

/** 출장 일정이 선택한 연·월과 하루라도 겹치면 포함한다. */
export function tripMatchesPeriod(
  startDate: string,
  endDate: string,
  year: TripPeriodValue,
  month: TripPeriodValue,
): boolean {
  if (year === "all" && month === "all") return true;
  if (!startDate) return false;

  let start = isoDay(startDate);
  let end = isoDay(endDate || startDate);
  if (!end) end = start;
  if (end < start) [start, end] = [end, start];

  if (year !== "all" && month !== "all") {
    const lastDay = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, "0");
    const rangeStart = `${year}-${mm}-01`;
    const rangeEnd = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
    return start <= rangeEnd && end >= rangeStart;
  }

  if (year !== "all") {
    return start <= `${year}-12-31` && end >= `${year}-01-01`;
  }

  if (month === "all") return true;
  return rangeIncludesMonth(start, end, month);
}

function rangeIncludesMonth(start: string, end: string, month: number): boolean {
  const startParts = start.split("-");
  const endParts = end.split("-");
  let year = Number(startParts[0]);
  let cursor = Number(startParts[1]);
  const endYear = Number(endParts[0]);
  const endMonth = Number(endParts[1]);
  if (!year || !cursor || !endYear || !endMonth) return false;

  for (let step = 0; step < 240; step += 1) {
    if (cursor === month) return true;
    if (year === endYear && cursor === endMonth) return false;
    cursor += 1;
    if (cursor > 12) {
      cursor = 1;
      year += 1;
    }
  }

  return false;
}
