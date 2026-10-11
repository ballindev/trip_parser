import { isLocalRegion } from "@/lib/attachment-rates";
import {
  isInvalidWorkTimeRange,
  requiresMorningClaimSelection,
  timeToMinutes,
} from "@/lib/daily-hours";
import type { LodgingCostItem, ReportForm, TransportCostItem } from "@/lib/types";

function formatShortDate(date: string): string {
  const matched = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!matched) return date;
  return `${Number(matched[1])}.${Number(matched[2])}`;
}

function joinDates(dates: string[]): string {
  return dates.map(formatShortDate).join(", ");
}

function isTransportComplete(item: TransportCostItem): boolean {
  const base =
    Boolean(item.mode) &&
    item.amount > 0 &&
    item.people > 0 &&
    item.times > 0;
  if (!base) return false;
  if (item.mode === "렌트") {
    const personIds = item.personIds ?? [];
    return personIds.length >= 1 && personIds.length === item.people;
  }
  return true;
}

function isLodgingComplete(item: LodgingCostItem): boolean {
  return item.amount > 0 && item.times > 0;
}

/** 제출에 빠진 필수값을 짧은 라벨로 반환합니다. */
export function getMissingRequiredLabels(form: ReportForm): string[] {
  const missing: string[] = [];

  if (!form.region?.trim()) missing.push("지역");

  if (!form.startDate || !form.endDate) {
    missing.push("출장 일정");
  } else if (form.startDate > form.endDate) {
    missing.push("출장 일정(시작≤종료)");
  }

  if (form.dailyHours.length === 0) {
    missing.push("날짜별 근무시간");
  } else {
    const incompleteTimeDates: string[] = [];
    const morningClaimDates: string[] = [];

    for (const day of form.dailyHours) {
      if (!day.startTime?.trim() || !day.endTime?.trim()) {
        incompleteTimeDates.push(day.date);
        continue;
      }
      if (
        timeToMinutes(day.startTime) === null ||
        timeToMinutes(day.endTime) === null ||
        isInvalidWorkTimeRange(day.startTime, day.endTime)
      ) {
        incompleteTimeDates.push(day.date);
        continue;
      }
      if (
        requiresMorningClaimSelection(
          day.startTime,
          day.endTime,
          day.date,
        ) &&
        !day.morningClaim
      ) {
        morningClaimDates.push(day.date);
      }
    }

    if (incompleteTimeDates.length > 0) {
      missing.push(`근무시간(${joinDates(incompleteTimeDates)})`);
    }
    if (morningClaimDates.length > 0) {
      missing.push(`오전 청구방식(${joinDates(morningClaimDates)})`);
    }
  }

  // 관내(서울)는 식비·교통비·숙박비 미지원 — 해당 필수값 검증 생략
  if (!isLocalRegion(form.region ?? "")) {
    const transportItems = form.transportItems ?? [];
    if (transportItems.some((item) => !isTransportComplete(item))) {
      const needsMode = transportItems.some(
        (item) =>
          !item.mode && (item.amount > 0 || item.people > 0 || item.times > 0),
      );
      const needsValues = transportItems.some(
        (item) =>
          Boolean(item.mode) &&
          !(item.amount > 0 && item.people > 0 && item.times > 0),
      );
      const emptyRow = transportItems.some(
        (item) =>
          !item.mode && item.amount <= 0 && item.people <= 0 && item.times <= 0,
      );
      const needsRentPeople = transportItems.some((item) => {
        if (item.mode !== "렌트") return false;
        if (!(item.amount > 0 && item.people > 0 && item.times > 0)) return false;
        const personIds = item.personIds ?? [];
        return personIds.length < 1 || personIds.length !== item.people;
      });

      if (needsMode) missing.push("교통비 수단");
      if (needsValues || emptyRow) missing.push("교통비(금액·인원·회수)");
      if (needsRentPeople) missing.push("교통비 렌트 인원");
    }

    const lodgingItems = form.lodgingItems ?? [];
    if (lodgingItems.some((item) => !isLodgingComplete(item))) {
      missing.push("숙박비(금액·일수)");
    }
  }

  return missing;
}

/** 제출에 필요한 필수값이 모두 형식에 맞게 채워졌는지 */
export function isReportReadyToSubmit(form: ReportForm): boolean {
  return getMissingRequiredLabels(form).length === 0;
}
