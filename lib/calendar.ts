/** 주말·관공서 공휴일 판별 (식비/오전 청구 규칙용) */

function toDateKey(date: string): string | null {
  const matched = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return null;
  return `${matched[1]}-${matched[2]}-${matched[3]}`;
}

function parseLocalDate(date: string): Date | null {
  const key = toDateKey(date);
  if (!key) return null;
  const value = new Date(`${key}T00:00:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** 요일: 0=일 … 6=토 */
export function isWeekend(date: string): boolean {
  const value = parseLocalDate(date);
  if (!value) return false;
  const day = value.getDay();
  return day === 0 || day === 6;
}

/**
 * 연도별 관공서 공휴일 (YYYY-MM-DD).
 * 설·추석 등은 해당 연도 음력 공휴일·대체공휴일을 포함합니다.
 */
const PUBLIC_HOLIDAYS_BY_YEAR: Record<string, readonly string[]> = {
  "2025": [
    "2025-01-01",
    "2025-01-28",
    "2025-01-29",
    "2025-01-30",
    "2025-03-01",
    "2025-03-03",
    "2025-05-05",
    "2025-05-06",
    "2025-06-06",
    "2025-08-15",
    "2025-10-03",
    "2025-10-05",
    "2025-10-06",
    "2025-10-07",
    "2025-10-08",
    "2025-10-09",
    "2025-12-25",
  ],
  "2026": [
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-03-01",
    "2026-03-02",
    "2026-05-05",
    "2026-05-24",
    "2026-05-25",
    "2026-06-06",
    "2026-08-15",
    "2026-08-17",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-10-03",
    "2026-10-05",
    "2026-10-09",
    "2026-12-25",
  ],
  "2027": [
    "2027-01-01",
    "2027-02-06",
    "2027-02-07",
    "2027-02-08",
    "2027-02-09",
    "2027-03-01",
    "2027-05-05",
    "2027-05-13",
    "2027-06-06",
    "2027-08-15",
    "2027-08-16",
    "2027-09-14",
    "2027-09-15",
    "2027-09-16",
    "2027-10-03",
    "2027-10-04",
    "2027-10-09",
    "2027-10-11",
    "2027-12-25",
  ],
};

const PUBLIC_HOLIDAY_SET = new Set(
  Object.values(PUBLIC_HOLIDAYS_BY_YEAR).flat(),
);

export function isPublicHoliday(date: string): boolean {
  const key = toDateKey(date);
  if (!key) return false;
  return PUBLIC_HOLIDAY_SET.has(key);
}

/** 주말 또는 공휴일 */
export function isNonWorkingDay(date: string): boolean {
  return isWeekend(date) || isPublicHoliday(date);
}
