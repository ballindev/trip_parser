import {
  dailyAllowanceForDay,
  isLocalRegion,
  lodgingCapForRegion,
  mealPayByCount,
  MEAL_UNIT_RATE,
} from "@/lib/attachment-rates";
import { eligibleMeals } from "@/lib/daily-meals";
import { formatCurrency } from "@/lib/format";
import { calcCostLineTotal } from "@/lib/transport-cost";
import type {
  DailyMeal,
  DailyWorkHours,
  Participant,
  Person,
  TransportMode,
  Trip,
} from "@/lib/types";

const HANGUL_ORDINALS = [
  "가",
  "나",
  "다",
  "라",
  "마",
  "바",
  "사",
  "아",
  "자",
  "차",
  "카",
  "타",
  "파",
  "하",
] as const;

const MEAL_KEYS = [
  { key: "breakfast" as const, label: "조식", time: "09:00" },
  { key: "lunch" as const, label: "중식", time: "12:00" },
  { key: "dinner" as const, label: "석식", time: "18:00" },
];

function hangulOrdinal(index: number): string {
  return HANGUL_ORDINALS[index] ?? `${index + 1}`;
}

function indent(level: 1 | 2, text: string): string {
  return `${"  ".repeat(level)}${text}`;
}

/**
 * 하위 항목이 1개면 "제목: 내용", 2개 이상이면 제목 + 가/나/다 목록으로 만듭니다.
 */
function formatTitledList(title: string, bodies: string[]): string {
  if (bodies.length === 0) return "";
  if (bodies.length === 1) {
    return `${title}: ${bodies[0]}`;
  }
  return joinLines([
    title,
    ...bodies.map((body, index) =>
      indent(1, `${hangulOrdinal(index)}. ${body}`),
    ),
  ]);
}

function won(value: number): string {
  return `${formatCurrency(value)} 원`;
}

function dayIndexFromStart(startDate: string, date: string): number {
  if (!startDate || !date || date < startDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const current = new Date(`${date}T00:00:00`);
  return Math.round((current.getTime() - start.getTime()) / 86_400_000) + 1;
}

function formatNames(names: string[]): string {
  return names.join(", ");
}

function joinLines(sections: string[]): string {
  return sections.filter(Boolean).join("\n");
}

function hasRent(participant: Participant): boolean {
  return (participant.form.transportItems ?? []).some(
    (item) => item.mode === "렌트",
  );
}

function resolveParticipantPersonId(
  participant: Participant,
  people: Person[] = [],
): string | null {
  if (participant.personId) return participant.personId;
  const matched = people.find((person) => person.name === participant.name);
  return matched?.id ?? null;
}

/** 출장 내 렌트 탑승·작성자 personId 집합을 모읍니다. */
export function collectRentHalfPersonIds(
  participants: Participant[],
): Set<string> {
  const ids = new Set<string>();
  for (const participant of participants) {
    for (const item of participant.form.transportItems ?? []) {
      if (item.mode !== "렌트") continue;
      if (participant.personId) ids.add(participant.personId);
      for (const personId of item.personIds ?? []) {
        if (personId) ids.add(personId);
      }
    }
  }
  return ids;
}

/** 참여자가 렌트 일비 반액 대상인지 판정합니다. */
export function isRentHalfParticipant(
  participant: Participant,
  rentHalfPersonIds: Set<string>,
  people: Person[] = [],
): boolean {
  if (hasRent(participant)) return true;
  const personId = resolveParticipantPersonId(participant, people);
  if (personId && rentHalfPersonIds.has(personId)) return true;
  return false;
}

function mealByDate(participant: Participant): Map<string, DailyMeal> {
  return new Map(
    (participant.form.dailyMeals ?? []).map((meal) => [meal.date, meal]),
  );
}

function paidAndBizMeals(
  day: DailyWorkHours,
  biz: DailyMeal | undefined,
): { paid: string[]; biz: string[] } {
  const eligible = eligibleMeals(day);
  const paid: string[] = [];
  const bizMeals: string[] = [];

  for (const option of MEAL_KEYS) {
    if (!eligible[option.key]) continue;
    if (biz?.[option.key]) {
      bizMeals.push(option.label);
    } else {
      paid.push(option.label);
    }
  }

  return { paid, biz: bizMeals };
}

/** 개인 폼 기준으로 일비·식비 합계를 계산합니다. */
export function calcPersonAllowances(
  participant: Participant,
  options?: {
    rentHalfPersonIds?: Set<string>;
    people?: Person[];
  },
): {
  dailyAllowance: number;
  mealPay: number;
} {
  const rentHalfPersonIds =
    options?.rentHalfPersonIds ?? collectRentHalfPersonIds([participant]);
  const rentHalf = isRentHalfParticipant(
    participant,
    rentHalfPersonIds,
    options?.people,
  );
  const region = participant.form.region ?? "";
  const local = isLocalRegion(region);
  const meals = mealByDate(participant);

  let dailyAllowance = 0;
  let mealPay = 0;

  for (const day of participant.form.dailyHours ?? []) {
    if (!day.startTime || !day.endTime) continue;
    dailyAllowance += dailyAllowanceForDay({
      region,
      hours: day.hours,
      rentHalf,
    });

    if (local) continue;
    const { paid } = paidAndBizMeals(day, meals.get(day.date));
    mealPay += mealPayByCount(paid.length);
  }

  return { dailyAllowance, mealPay };
}

function buildDailyAllowanceSection(
  participants: Participant[],
  people: Person[] = [],
): string {
  type Group = {
    rate: number;
    days: number;
    rent: boolean;
    names: string[];
  };

  const groups = new Map<string, Group>();
  const rentHalfPersonIds = collectRentHalfPersonIds(participants);

  for (const participant of participants) {
    const rent = isRentHalfParticipant(
      participant,
      rentHalfPersonIds,
      people,
    );
    const region = participant.form.region ?? "";
    const rateCounts = new Map<number, number>();

    for (const day of participant.form.dailyHours ?? []) {
      if (!day.startTime || !day.endTime) continue;
      const rate = dailyAllowanceForDay({
        region,
        hours: day.hours,
        rentHalf: rent,
      });
      if (rate <= 0) continue;
      rateCounts.set(rate, (rateCounts.get(rate) ?? 0) + 1);
    }

    for (const [rate, days] of rateCounts) {
      const key = `${rate}|${days}|${rent ? 1 : 0}`;
      const existing = groups.get(key);
      if (existing) {
        existing.names.push(participant.name);
      } else {
        groups.set(key, {
          rate,
          days,
          rent,
          names: [participant.name],
        });
      }
    }
  }

  const ordered = [...groups.values()].sort((a, b) => {
    if (b.rate !== a.rate) return b.rate - a.rate;
    if (b.days !== a.days) return b.days - a.days;
    return Number(a.rent) - Number(b.rent);
  });

  if (ordered.length === 0) return "";

  const bodies = ordered.map((group) => {
    const people = group.names.length;
    const total = group.rate * people * group.days;
    const rentNote = group.rent ? " (차량렌트)" : "";
    return `${won(group.rate)} × ${people}명 × ${group.days}일 = ${won(total)} (${formatNames(group.names)})${rentNote}`;
  });

  return formatTitledList("일비", bodies);
}

function buildMealSection(participants: Participant[]): string {
  type PaidGroup = {
    dayIndex: number;
    mealKey: string;
    mealLabels: string[];
    mealCount: number;
    names: string[];
  };

  type BizGroup = {
    dayIndex: number;
    mealKey: string;
    mealLabels: string[];
    names: string[];
  };

  const paidGroups = new Map<string, PaidGroup>();
  const bizGroups = new Map<string, BizGroup>();

  for (const participant of participants) {
    if (isLocalRegion(participant.form.region ?? "")) continue;
    const startDate = participant.form.startDate;
    const meals = mealByDate(participant);

    for (const day of participant.form.dailyHours ?? []) {
      const dayIndex = dayIndexFromStart(startDate, day.date);
      if (dayIndex <= 0) continue;

      const { paid, biz } = paidAndBizMeals(day, meals.get(day.date));

      if (paid.length > 0) {
        const mealKey = paid.join(",");
        const key = `${dayIndex}|${mealKey}`;
        const existing = paidGroups.get(key);
        if (existing) {
          existing.names.push(participant.name);
        } else {
          paidGroups.set(key, {
            dayIndex,
            mealKey,
            mealLabels: paid,
            mealCount: paid.length,
            names: [participant.name],
          });
        }
      }

      if (biz.length > 0) {
        const mealKey = biz.join(",");
        const key = `${dayIndex}|${mealKey}`;
        const existing = bizGroups.get(key);
        if (existing) {
          existing.names.push(participant.name);
        } else {
          bizGroups.set(key, {
            dayIndex,
            mealKey,
            mealLabels: biz,
            names: [participant.name],
          });
        }
      }
    }
  }

  const paidOrdered = [...paidGroups.values()].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.mealKey.localeCompare(b.mealKey, "ko");
  });

  const paidBodies = paidOrdered.map((group) => {
    const people = group.names.length;
    const perPerson = mealPayByCount(group.mealCount);
    const total = perPerson * people;
    const mealPart = group.mealLabels.join(", ");
    return group.mealCount === 3
      ? `${won(perPerson)} × ${people}명 = ${won(total)} (${group.dayIndex}일차 ${mealPart} / ${formatNames(group.names)})`
      : `${won(MEAL_UNIT_RATE)} × ${people}명 × ${group.mealCount}식 = ${won(total)} (${group.dayIndex}일차 ${mealPart} / ${formatNames(group.names)})`;
  });

  const bizOrdered = [...bizGroups.values()].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.mealKey.localeCompare(b.mealKey, "ko");
  });

  const bizBodies = bizOrdered.map(
    (group) =>
      `${group.dayIndex}일차 ${group.mealLabels.join(", ")} / ${formatNames(group.names)}`,
  );

  return joinLines([
    formatTitledList("식비", paidBodies),
    formatTitledList("※ 사업추진비 사용", bizBodies),
  ]);
}

function buildTransportSection(participants: Participant[]): string {
  type ItemGroup = {
    amount: number;
    people: number;
    times: number;
    names: string[];
  };

  const byMode = new Map<string, Map<string, ItemGroup>>();

  for (const participant of participants) {
    if (isLocalRegion(participant.form.region ?? "")) continue;
    for (const item of participant.form.transportItems ?? []) {
      if (!item.mode || item.amount <= 0 || item.people <= 0 || item.times <= 0) {
        continue;
      }
      const modeMap = byMode.get(item.mode) ?? new Map<string, ItemGroup>();
      const key = `${item.amount}|${item.people}|${item.times}`;
      const existing = modeMap.get(key);
      if (existing) {
        existing.names.push(participant.name);
        existing.people += item.people;
      } else {
        modeMap.set(key, {
          amount: item.amount,
          people: item.people,
          times: item.times,
          names: [participant.name],
        });
      }
      byMode.set(item.mode, modeMap);
    }
  }

  if (byMode.size === 0) return "";

  const modeOrder: TransportMode[] = ["항공편", "대중교통", "자차", "렌트"];
  const modeEntries = [...byMode.entries()].sort((a, b) => {
    const ai = modeOrder.indexOf(a[0] as TransportMode);
    const bi = modeOrder.indexOf(b[0] as TransportMode);
    const aRank = ai === -1 ? 99 : ai;
    const bRank = bi === -1 ? 99 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a[0].localeCompare(b[0], "ko");
  });

  const formatTransportItem = (item: ItemGroup) => {
    const total = item.amount * item.people * item.times;
    return `${won(item.amount)} × ${item.people}명 × ${item.times}회 = ${won(total)} (${formatNames(item.names)})`;
  };

  // 수단이 하나뿐이면 "가." 없이 제목에 붙입니다.
  if (modeEntries.length === 1) {
    const [mode, items] = modeEntries[0];
    const itemBodies = [...items.values()].map(formatTransportItem);
    if (itemBodies.length === 1) {
      return `교통비: ${mode} ${itemBodies[0]}`;
    }
    return joinLines([
      `교통비: ${mode}`,
      ...itemBodies.map((body, index) =>
        indent(1, `${index + 1}) ${body}`),
      ),
    ]);
  }

  const modeBlocks = modeEntries.map(([mode, items], modeIndex) => {
    const itemLines = [...items.values()].map((item, itemIndex) =>
      indent(2, `${itemIndex + 1}) ${formatTransportItem(item)}`),
    );
    return joinLines([
      indent(1, `${hangulOrdinal(modeIndex)}. ${mode}`),
      ...itemLines,
    ]);
  });

  return joinLines(["교통비", ...modeBlocks]);
}

function buildLodgingSection(participants: Participant[]): string {
  type ItemGroup = {
    amount: number;
    people: number;
    times: number;
    names: string[];
  };

  const groups = new Map<string, ItemGroup>();

  for (const participant of participants) {
    if (isLocalRegion(participant.form.region ?? "")) continue;
    for (const item of participant.form.lodgingItems ?? []) {
      if (item.amount <= 0 || item.times <= 0) continue;

      const key = `${item.amount}|${item.times}`;
      const existing = groups.get(key);
      if (existing) {
        existing.names.push(participant.name);
        existing.people += 1;
      } else {
        groups.set(key, {
          amount: item.amount,
          people: 1,
          times: item.times,
          names: [participant.name],
        });
      }
    }
  }

  const ordered = [...groups.values()].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return b.times - a.times;
  });

  if (ordered.length === 0) return "";

  const bodies = ordered.map((item) => {
    const total = item.amount * item.people * item.times;
    return `${won(item.amount)} × ${item.people}명 × ${item.times}일 = ${won(total)} (${formatNames(item.names)})`;
  });

  return formatTitledList("숙박비", bodies);
}

function buildAccountSection(trip: Trip): string {
  const summary = trip.summary?.trim();
  if (!summary) return "";
  // 계정과목 다음에 빈 줄을 하나 두기 위해 끝에 개행을 둡니다.
  return `계정과목: ${summary}\n`;
}

type AttachmentBlock = {
  /** 번호 매기기 대상이면 false, 사업추진비처럼 ※ 유지면 true */
  note: boolean;
  text: string;
};

function splitAttachmentBlocks(raw: string): AttachmentBlock[] {
  if (!raw.trim()) return [];

  const lines = raw.split("\n");
  const blocks: AttachmentBlock[] = [];
  let current: string[] = [];
  let currentNote = false;

  const flush = () => {
    if (current.length === 0) return;
    blocks.push({ note: currentNote, text: current.join("\n") });
    current = [];
  };

  for (const line of lines) {
    const isSectionStart =
      line === "일비" ||
      line.startsWith("일비:") ||
      line === "식비" ||
      line.startsWith("식비:") ||
      line === "교통비" ||
      line.startsWith("교통비:") ||
      line === "숙박비" ||
      line.startsWith("숙박비:") ||
      line.startsWith("계정과목:") ||
      line.startsWith("※ ");

    if (isSectionStart && current.length > 0) {
      flush();
    }

    if (isSectionStart) {
      currentNote = line.startsWith("※ ");
      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  flush();
  return blocks;
}

/** 생략된 항목을 건너뛰고 1, 2, 3… 순으로 번호를 매깁니다. ※ 항목은 번호를 붙이지 않습니다. */
function numberAttachmentSections(sections: string[]): string {
  let nextNumber = 1;

  return joinLines(
    sections.flatMap((section) => {
      const blocks = splitAttachmentBlocks(section);
      if (blocks.length === 0) return [];

      return blocks.map((block) => {
        if (block.note) return block.text;

        const lines = block.text.split("\n");
        const [first = "", ...rest] = lines;
        const numbered = `${nextNumber}. ${first}`;
        nextNumber += 1;
        // 계정과목 등 원본 끝의 빈 줄을 유지하기 위해 filter 없이 합칩니다.
        return [numbered, ...rest].join("\n");
      });
    }),
  );
}

function buildSettlementSection(grandTotal: number): string {
  return `• 총 결제금액 : ${won(grandTotal)}`;
}

function sumTransport(participants: Participant[]): number {
  return participants.reduce((sum, participant) => {
    if (isLocalRegion(participant.form.region ?? "")) return sum;
    return (
      sum +
      (participant.form.transportItems ?? []).reduce(
        (inner, item) => inner + calcCostLineTotal(item),
        0,
      )
    );
  }, 0);
}

function sumLodging(participants: Participant[]): number {
  return participants.reduce((sum, participant) => {
    if (isLocalRegion(participant.form.region ?? "")) return sum;
    return (
      sum +
      (participant.form.lodgingItems ?? []).reduce(
        (inner, item) => inner + calcCostLineTotal({ ...item, people: 1 }),
        0,
      )
    );
  }, 0);
}

/** 숙박 단가가 지역 한도를 넘는 항목 경고 */
export function getLodgingCapWarnings(
  trip: Trip,
): { participantName: string; amount: number; cap: number; region: string }[] {
  const warnings: {
    participantName: string;
    amount: number;
    cap: number;
    region: string;
  }[] = [];

  for (const participant of trip.participants) {
    const region = participant.form.region ?? "";
    if (isLocalRegion(region)) continue;
    const cap = lodgingCapForRegion(region);
    for (const item of participant.form.lodgingItems ?? []) {
      if (item.amount > cap) {
        warnings.push({
          participantName: participant.name,
          amount: item.amount,
          cap,
          region,
        });
      }
    }
  }

  return warnings;
}

/** 출장 단위 붙임 자료 텍스트를 생성합니다. */
export function buildAttachmentText(
  trip: Trip,
  people: Person[] = [],
): string {
  const participants = trip.participants;
  if (participants.length === 0) return "";

  const rentHalfPersonIds = collectRentHalfPersonIds(participants);
  const mealAndDailyTotal = participants.reduce((sum, participant) => {
    const { dailyAllowance, mealPay } = calcPersonAllowances(participant, {
      rentHalfPersonIds,
      people,
    });
    return sum + dailyAllowance + mealPay;
  }, 0);
  const grandTotal =
    mealAndDailyTotal +
    sumTransport(participants) +
    sumLodging(participants);

  const numberedBody = numberAttachmentSections([
    buildDailyAllowanceSection(participants, people),
    buildMealSection(participants),
    buildTransportSection(participants),
    buildLodgingSection(participants),
    buildAccountSection(trip),
  ]);

  return joinLines([numberedBody, buildSettlementSection(grandTotal)]);
}

export function getIncompleteParticipants(trip: Trip): Participant[] {
  return trip.participants.filter(
    (participant) => participant.status !== "완료",
  );
}

export function isTripReadyForAttachment(trip: Trip): boolean {
  return (
    trip.participants.length > 0 &&
    getIncompleteParticipants(trip).length === 0
  );
}
