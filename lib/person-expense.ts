import {
  calcPersonAllowances,
  collectRentHalfPersonIds,
} from "@/lib/attachment-text";
import { isLocalRegion } from "@/lib/attachment-rates";
import { sumCostLines } from "@/lib/transport-cost";
import type { Participant, Person, Trip } from "@/lib/types";

export type PersonExpenseTripItem = {
  tripId: string;
  participantId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  amount: number;
};

export type PersonExpensePeriodGroup = {
  key: string;
  label: string;
  count: number;
  total: number;
  items: PersonExpenseTripItem[];
};

export type PersonExpenseSummary = {
  personId: string;
  total: number;
  count: number;
  items: PersonExpenseTripItem[];
  byMonth: PersonExpensePeriodGroup[];
  byYear: PersonExpensePeriodGroup[];
};

/** 참가자 1명의 출장비 합계(일비+식비+교통+숙박). 관내는 식비·교통·숙박 제외. */
export function calcParticipantTotal(
  participant: Participant,
  options?: {
    tripParticipants?: Participant[];
    people?: Person[];
  },
): number {
  const tripParticipants = options?.tripParticipants ?? [participant];
  const rentHalfPersonIds = collectRentHalfPersonIds(tripParticipants);
  const local = isLocalRegion(participant.form.region ?? "");
  const transportItems = local ? [] : (participant.form.transportItems ?? []);
  const lodgingItems = local ? [] : (participant.form.lodgingItems ?? []);
  const { dailyAllowance, mealPay } = calcPersonAllowances(participant, {
    rentHalfPersonIds,
    people: options?.people,
  });
  return (
    dailyAllowance +
    mealPay +
    sumCostLines(transportItems) +
    sumCostLines(lodgingItems)
  );
}

function resolveTripStartDate(trip: Trip, participant: Participant): string {
  return trip.startDate || participant.form.startDate || "";
}

function resolveTripEndDate(trip: Trip, participant: Participant): string {
  return trip.endDate || participant.form.endDate || "";
}

function monthKey(isoDate: string): string | null {
  if (!isoDate || isoDate.length < 7) return null;
  return isoDate.slice(0, 7);
}

function yearKey(isoDate: string): string | null {
  if (!isoDate || isoDate.length < 4) return null;
  return isoDate.slice(0, 4);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const monthNum = Number(month);
  if (!year || !Number.isFinite(monthNum)) return key;
  return `${year}년 ${monthNum}월`;
}

function formatYearLabel(key: string): string {
  return `${key}년`;
}

function groupByPeriod(
  items: PersonExpenseTripItem[],
  getKey: (item: PersonExpenseTripItem) => string | null,
  formatLabel: (key: string) => string,
): PersonExpensePeriodGroup[] {
  const map = new Map<string, PersonExpensePeriodGroup>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += item.amount;
      existing.items.push(item);
    } else {
      map.set(key, {
        key,
        label: formatLabel(key),
        count: 1,
        total: item.amount,
        items: [item],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** 사람별 완료 출장비 건/월/년 집계. */
export function buildPersonExpenseSummary(
  trips: Trip[],
  personId: string,
  people: Person[] = [],
): PersonExpenseSummary {
  const items: PersonExpenseTripItem[] = [];

  for (const trip of trips) {
    for (const participant of trip.participants) {
      if (participant.personId !== personId) continue;
      if (participant.status !== "완료") continue;

      const startDate = resolveTripStartDate(trip, participant);
      const endDate = resolveTripEndDate(trip, participant);
      items.push({
        tripId: trip.id,
        participantId: participant.id,
        tripName: trip.name,
        startDate,
        endDate,
        amount: calcParticipantTotal(participant, {
          tripParticipants: trip.participants,
          people,
        }),
      });
    }
  }

  items.sort((a, b) => {
    const dateCmp = (b.startDate || "").localeCompare(a.startDate || "");
    if (dateCmp !== 0) return dateCmp;
    return b.tripName.localeCompare(a.tripName);
  });

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    personId,
    total,
    count: items.length,
    items,
    byMonth: groupByPeriod(items, (item) => monthKey(item.startDate), formatMonthLabel),
    byYear: groupByPeriod(items, (item) => yearKey(item.startDate), formatYearLabel),
  };
}
