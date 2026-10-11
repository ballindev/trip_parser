import type {
  CostLineItem,
  LodgingCostItem,
  TransportCostItem,
  TransportMode,
} from "./types";

export const TRANSPORT_MODES: TransportMode[] = [
  "대중교통",
  "항공편",
  "자차",
  "렌트",
];

export function createCostItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createTransportItem(
  partial?: Partial<Omit<TransportCostItem, "id" | "people">>,
): TransportCostItem {
  const personIds = [...(partial?.personIds ?? [])];
  const isRent = (partial?.mode ?? "") === "렌트";
  return {
    id: createCostItemId(),
    mode: "",
    amount: 0,
    times: 0,
    ...partial,
    personIds,
    people: isRent ? personIds.length : 0,
  };
}

/** 렌트 탑승 인원에 맞춰 people 수를 동기화합니다. */
export function withTransportPeople(
  item: TransportCostItem,
  personIds: string[],
  /** 작성자 personId가 없으면 본인 1명을 인원에 가산 */
  authorExtra = 0,
): TransportCostItem {
  const uniqueIds = [...new Set(personIds)];
  return {
    ...item,
    personIds: uniqueIds,
    people: uniqueIds.length + authorExtra,
  };
}

export function createLodgingItem(
  partial?: Partial<Omit<LodgingCostItem, "id" | "people">>,
): LodgingCostItem {
  return {
    id: createCostItemId(),
    amount: 0,
    times: 0,
    ...partial,
    people: 1,
  };
}

/** 금액 × 인원 × 회수(또는 일수) */
export function calcCostLineTotal(item: CostLineItem): number {
  const amount = Number.isFinite(item.amount) ? item.amount : 0;
  const people = Number.isFinite(item.people) ? item.people : 0;
  const times = Number.isFinite(item.times) ? item.times : 0;
  return Math.max(0, amount) * Math.max(0, people) * Math.max(0, times);
}

/** @deprecated use calcCostLineTotal */
export const calcTransportItemTotal = calcCostLineTotal;

export function sumCostLines(
  items: CostLineItem[] | null | undefined,
): number {
  if (!items?.length) return 0;
  return items.reduce((sum, item) => sum + calcCostLineTotal(item), 0);
}

/** @deprecated use sumCostLines */
export const sumTransportCost = sumCostLines;
