import { normalizeRegion } from "@/lib/regions";
import type {
  DailyMeal,
  DailyWorkHours,
  LodgingCostItem,
  MorningClaim,
  Participant,
  Person,
  ReportForm,
  Team,
  TransportCostItem,
  TransportMode,
  Trip,
  WriteStatus,
} from "@/lib/types";

export type DbPerson = {
  id: string;
  name: string;
  rank: string;
  department: string;
  employment_status?: "재직" | "퇴사" | null;
  resigned_at?: string | null;
};

export type DbTeam = {
  id: string;
  name: string;
  sort_order?: number | null;
};

export type DbTeamMember = {
  team_id: string;
  person_id: string;
  sort_order?: number | null;
};

export type DbTrip = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  summary: string;
};

export type DbParticipant = {
  id: string;
  trip_id: string;
  person_id: string | null;
  name: string;
  department: string;
  status: WriteStatus;
  sort_order?: number | null;
};

export type DbReport = {
  participant_id: string;
  region: string;
  start_date: string | null;
  end_date: string | null;
};

export type DbWorkHour = {
  participant_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  hours: number | string;
  morning_claim?: string | null;
};

function mapMorningClaim(
  value: string | null | undefined,
): MorningClaim | null {
  if (value === "overtime" || value === "breakfast") return value;
  return null;
}

export type DbMeal = {
  participant_id: string;
  meal_date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

export type DbTransport = {
  id: string;
  participant_id: string;
  mode: string;
  amount: number;
  people: number;
  times: number;
  sort_order: number;
};

export type DbLodging = {
  id: string;
  participant_id: string;
  amount: number;
  people: number;
  times: number;
  sort_order: number;
};

export type DbTransportPerson = {
  transport_item_id: string;
  person_id: string;
};

export function mapPerson(row: DbPerson): Person {
  return {
    id: row.id,
    name: row.name,
    rank: row.rank ?? "",
    department: row.department ?? "",
    employmentStatus: row.employment_status === "퇴사" ? "퇴사" : "재직",
    resignedAt: row.resigned_at ?? null,
  };
}

export function mapTeams(
  teams: DbTeam[],
  members: DbTeamMember[],
): Team[] {
  const sortedMembers = [...members].sort((a, b) => {
    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.person_id.localeCompare(b.person_id);
  });

  const byTeam = new Map<string, string[]>();
  sortedMembers.forEach((member) => {
    const list = byTeam.get(member.team_id) ?? [];
    list.push(member.person_id);
    byTeam.set(member.team_id, list);
  });

  return [...teams]
    .sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    })
    .map((team) => ({
      id: team.id,
      name: team.name,
      memberIds: byTeam.get(team.id) ?? [],
    }));
}

function emptyForm(startDate = "", endDate = ""): ReportForm {
  return {
    region: "",
    startDate,
    endDate,
    dailyHours: [],
    dailyMeals: [],
    transportItems: [],
    lodgingItems: [],
  };
}

export function mapReportForm(input: {
  report?: DbReport | null;
  hours: DbWorkHour[];
  meals: DbMeal[];
  transports: DbTransport[];
  lodgings: DbLodging[];
  transportPeople?: DbTransportPerson[];
  fallbackStart?: string;
  fallbackEnd?: string;
}): ReportForm {
  const {
    report,
    hours,
    meals,
    transports,
    lodgings,
    transportPeople = [],
    fallbackStart = "",
    fallbackEnd = "",
  } = input;

  const peopleByTransport = new Map<string, string[]>();
  transportPeople.forEach((row) => {
    const list = peopleByTransport.get(row.transport_item_id) ?? [];
    list.push(row.person_id);
    peopleByTransport.set(row.transport_item_id, list);
  });

  const dailyHours: DailyWorkHours[] = [...hours]
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .map((row) => ({
      date: row.work_date,
      startTime: row.start_time ?? "",
      endTime: row.end_time ?? "",
      hours: Number(row.hours) || 0,
      morningClaim: mapMorningClaim(row.morning_claim),
    }));

  const dailyMeals: DailyMeal[] = [...meals]
    .sort((a, b) => a.meal_date.localeCompare(b.meal_date))
    .map((row) => ({
      date: row.meal_date,
      breakfast: row.breakfast,
      lunch: row.lunch,
      dinner: row.dinner,
    }));

  const transportItems: TransportCostItem[] = [...transports]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      mode: (row.mode ?? "") as TransportMode | "",
      amount: row.amount ?? 0,
      people: row.people ?? 0,
      times: row.times ?? 0,
      personIds: peopleByTransport.get(row.id) ?? [],
    }));

  const lodgingItems: LodgingCostItem[] = [...lodgings]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      amount: row.amount ?? 0,
      people: 1,
      times: row.times ?? 0,
    }));

  return {
    region: normalizeRegion(report?.region ?? ""),
    startDate: report?.start_date ?? fallbackStart,
    endDate: report?.end_date ?? fallbackEnd,
    dailyHours,
    dailyMeals,
    transportItems,
    lodgingItems,
  };
}

export function mapTrips(input: {
  trips: DbTrip[];
  participants: DbParticipant[];
  reports: DbReport[];
  hours: DbWorkHour[];
  meals: DbMeal[];
  transports: DbTransport[];
  lodgings: DbLodging[];
  transportPeople?: DbTransportPerson[];
}): Trip[] {
  const {
    trips,
    participants,
    reports,
    hours,
    meals,
    transports,
    lodgings,
    transportPeople = [],
  } = input;

  const reportByParticipant = new Map(
    reports.map((row) => [row.participant_id, row]),
  );

  const groupByParticipant = <T extends { participant_id: string }>(
    rows: T[],
  ) => {
    const map = new Map<string, T[]>();
    rows.forEach((row) => {
      const list = map.get(row.participant_id) ?? [];
      list.push(row);
      map.set(row.participant_id, list);
    });
    return map;
  };

  const hoursBy = groupByParticipant(hours);
  const mealsBy = groupByParticipant(meals);
  const transportsBy = groupByParticipant(transports);
  const lodgingsBy = groupByParticipant(lodgings);

  const transportIds = new Set(transports.map((row) => row.id));
  const transportPeopleFiltered = transportPeople.filter((row) =>
    transportIds.has(row.transport_item_id),
  );

  const participantsByTrip = new Map<string, Participant[]>();
  const sortOrderById = new Map<string, number>();

  participants.forEach((row, index) => {
    const form = mapReportForm({
      report: reportByParticipant.get(row.id),
      hours: hoursBy.get(row.id) ?? [],
      meals: mealsBy.get(row.id) ?? [],
      transports: transportsBy.get(row.id) ?? [],
      lodgings: lodgingsBy.get(row.id) ?? [],
      transportPeople: transportPeopleFiltered,
    });

    const participant: Participant = {
      id: row.id,
      personId: row.person_id ?? undefined,
      name: row.name,
      department: row.department,
      status: row.status,
      form,
    };

    sortOrderById.set(
      row.id,
      typeof row.sort_order === "number" ? row.sort_order : index,
    );

    const list = participantsByTrip.get(row.trip_id) ?? [];
    list.push(participant);
    participantsByTrip.set(row.trip_id, list);
  });

  for (const list of participantsByTrip.values()) {
    list.sort(
      (a, b) =>
        (sortOrderById.get(a.id) ?? 0) - (sortOrderById.get(b.id) ?? 0),
    );
  }

  return trips.map((trip) => ({
    id: trip.id,
    name: trip.name,
    startDate: trip.start_date,
    endDate: trip.end_date,
    summary: trip.summary ?? "",
    participants: participantsByTrip.get(trip.id) ?? [],
  }));
}

export { emptyForm };
