import { REGION_LOCAL, REGION_REMOTE } from "@/lib/regions";
import type { Participant, ReportForm, Trip } from "@/lib/types";

export function makeForm(overrides: Partial<ReportForm> = {}): ReportForm {
  return {
    region: REGION_REMOTE,
    startDate: "2026-03-10",
    endDate: "2026-03-10",
    dailyHours: [
      {
        date: "2026-03-10",
        startTime: "09:00",
        endTime: "18:00",
        hours: 9,
        morningClaim: null,
      },
    ],
    dailyMeals: [
      {
        date: "2026-03-10",
        breakfast: false,
        lunch: true,
        dinner: true,
      },
    ],
    transportItems: [
      {
        id: "t1",
        mode: "대중교통",
        amount: 10_000,
        people: 1,
        times: 2,
        personIds: [],
      },
    ],
    lodgingItems: [
      {
        id: "l1",
        amount: 70_000,
        people: 1,
        times: 1,
      },
    ],
    ...overrides,
  };
}

export function makeParticipant(
  overrides: Partial<Participant> & { form?: ReportForm } = {},
): Participant {
  const { form, ...rest } = overrides;
  return {
    id: "part-1",
    personId: "person-1",
    name: "김출장",
    department: "기획팀",
    status: "완료",
    form: form ?? makeForm(),
    ...rest,
  };
}

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    name: "부산 출장",
    startDate: "2026-03-10",
    endDate: "2026-03-10",
    summary: "출장비",
    participants: [makeParticipant()],
    ...overrides,
  };
}
