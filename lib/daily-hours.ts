import { isNonWorkingDay } from "@/lib/calendar";
import type { DailyWorkHours, MorningClaim } from "@/lib/types";

/** `HH:mm` → 분 단위. 잘못된 값이면 null */
export function timeToMinutes(time: string): number | null {
  const matched = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) return null;
  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatMinutesAsHours(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}시간 ${minutes}분`;
}

/** 업무시작~마감으로 근무시간(시간)을 계산합니다. 분 단위를 그대로 보존합니다. */
export function calcWorkHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return (end - start) / 60;
}

export function formatWorkHours(hours: number): string {
  return formatMinutesAsHours(hours * 60);
}

/** 시작·마감이 모두 있고, 시작이 마감보다 늦거나 같은지 여부 */
export function isInvalidWorkTimeRange(
  startTime: string,
  endTime: string,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return false;
  return end <= start;
}

/** 시작·마감 시각으로 근무시간을 `N시간 M분` 표시합니다. */
export function formatWorkDuration(startTime: string, endTime: string): string {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return "0시간 0분";
  return formatMinutesAsHours(end - start);
}

/** 일자별 근무시간을 분 단위로 합산해 `N시간 M분`으로 표시합니다. */
export function formatTotalWorkHours(items: DailyWorkHours[]): string {
  const totalMinutes = items.reduce((sum, item) => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    if (start === null || end === null || end <= start) return sum;
    return sum + (end - start);
  }, 0);

  return formatMinutesAsHours(totalMinutes);
}

function emptyDay(date: string): DailyWorkHours {
  return {
    date,
    startTime: "",
    endTime: "",
    hours: 0,
    morningClaim: null,
  };
}

/** 근무 구간이 특정 시각을 포함하는지 (`start <= t <= end`) */
export function rangeIncludesTime(
  startTime: string,
  endTime: string,
  targetTime: string,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const target = timeToMinutes(targetTime);
  if (start === null || end === null || target === null) return false;
  return start <= target && target <= end;
}

/**
 * 평일: 08:00 이전(포함)부터 09:00까지 근무면 시간외수당/조식 중 하나 필수.
 * 예) 08:00~18:00 → 선택 필요 / 08:20~18:00 → 선택 없음(조·중·석 자동).
 */
export function needsWeekdayMorningChoice(
  startTime: string,
  endTime: string,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return false;
  return start <= 8 * 60 && end >= 9 * 60;
}

/**
 * 주말·공휴일 안내 표시: 09:00이 근무에 포함되면
 * 시간외수당·조식 모두 지급 가능하다는 안내만 보여 줍니다(선택 UI 없음).
 */
export function showsWeekendMorningInfo(
  startTime: string,
  endTime: string,
  workDate: string,
): boolean {
  if (!workDate || !isNonWorkingDay(workDate)) return false;
  return rangeIncludesTime(startTime, endTime, "09:00");
}

/** 평일 오전 청구(시간외/조식) 선택 UI 표시 여부 */
export function needsMorningClaim(
  startTime: string,
  endTime: string,
  workDate = "",
): boolean {
  if (workDate && isNonWorkingDay(workDate)) return false;
  return needsWeekdayMorningChoice(startTime, endTime);
}

/** 평일에만 오전 청구 선택이 제출 필수 */
export function requiresMorningClaimSelection(
  startTime: string,
  endTime: string,
  workDate: string,
): boolean {
  if (isNonWorkingDay(workDate)) return false;
  return needsWeekdayMorningChoice(startTime, endTime);
}

export function resolveMorningClaim(
  startTime: string,
  endTime: string,
  previous: MorningClaim | null | undefined,
  workDate = "",
): MorningClaim | null {
  // 주말·공휴일은 선택값 없이 식비(조식 포함)·시간외는 별도 처리
  if (workDate && isNonWorkingDay(workDate)) return null;
  if (!needsMorningClaim(startTime, endTime, workDate)) return null;
  return previous ?? null;
}

export function buildDailyHours(
  startDate: string,
  endDate: string,
): DailyWorkHours[] {
  if (!startDate || !endDate || endDate < startDate) return [];

  const days: DailyWorkHours[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    days.push(emptyDay(`${year}-${month}-${day}`));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/** 기존 입력 시간을 유지하면서 일정 범위에 맞춰 일자 목록을 다시 구성합니다. */
export function rebuildDailyHours(
  startDate: string,
  endDate: string,
  previous: DailyWorkHours[],
): DailyWorkHours[] {
  const previousByDate = new Map(previous.map((item) => [item.date, item]));
  return buildDailyHours(startDate, endDate).map((item) => {
    const prev = previousByDate.get(item.date);
    if (!prev) return item;
    const startTime = prev.startTime;
    const endTime = prev.endTime;
    return {
      date: item.date,
      startTime,
      endTime,
      hours: calcWorkHours(startTime, endTime),
      morningClaim: resolveMorningClaim(
        startTime,
        endTime,
        prev.morningClaim,
        item.date,
      ),
    };
  });
}

export function withUpdatedDayTimes(
  item: DailyWorkHours,
  patch: Partial<
    Pick<DailyWorkHours, "startTime" | "endTime" | "morningClaim">
  >,
): DailyWorkHours {
  const startTime = patch.startTime ?? item.startTime;
  const endTime = patch.endTime ?? item.endTime;
  const morningClaim =
    patch.morningClaim !== undefined
      ? resolveMorningClaim(
          startTime,
          endTime,
          patch.morningClaim,
          item.date,
        )
      : resolveMorningClaim(
          startTime,
          endTime,
          item.morningClaim,
          item.date,
        );
  return {
    ...item,
    startTime,
    endTime,
    hours: calcWorkHours(startTime, endTime),
    morningClaim,
  };
}
