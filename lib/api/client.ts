import type { ChangelogItem } from "@/lib/changelog";
import type {
  ChangeRequest,
  ChangeRequestCategory,
  ChangeRequestStatus,
  Person,
  ReportForm,
  Team,
  Trip,
  WriteStatus,
} from "@/lib/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error || `요청 실패 (${response.status})`);
  }

  return payload as T;
}

export const api = {
  getPeople: () => request<Person[]>("/api/people"),
  createPerson: (body: {
    name: string;
    rank: string;
    department: string;
    teamId?: string;
  }) =>
    request<Person>("/api/people", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePerson: (
    id: string,
    body: {
      name?: string;
      rank?: string;
      department?: string;
      teamId?: string;
      employmentStatus?: "재직" | "퇴사";
    },
  ) =>
    request<Person>(`/api/people/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePerson: (id: string) =>
    request<{ ok: boolean }>(`/api/people/${id}`, { method: "DELETE" }),
  reorderPeople: (orderedIds: string[]) =>
    request<{ ok: boolean; orderedIds: string[] }>("/api/people", {
      method: "PATCH",
      body: JSON.stringify({ orderedIds }),
    }),

  getTeams: () => request<Team[]>("/api/teams"),
  createTeam: (body: { name: string; memberIds?: string[] }) =>
    request<Team>("/api/teams", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTeam: (
    id: string,
    body: { name?: string; memberIds?: string[] },
  ) =>
    request<Team>(`/api/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  reorderTeams: (orderedIds: string[]) =>
    request<{ ok: boolean; orderedIds: string[] }>("/api/teams", {
      method: "PATCH",
      body: JSON.stringify({ orderedIds }),
    }),
  deleteTeam: (id: string) =>
    request<{ ok: boolean }>(`/api/teams/${id}`, { method: "DELETE" }),

  getTrips: () => request<Trip[]>("/api/trips"),
  createTrip: (body: {
    name: string;
    startDate: string;
    endDate: string;
    summary?: string;
  }) =>
    request<Trip>("/api/trips", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTrip: (
    id: string,
    body: {
      name?: string;
      startDate?: string;
      endDate?: string;
      summary?: string;
    },
  ) =>
    request<Partial<Trip> & { id: string }>(`/api/trips/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTrip: (id: string) =>
    request<{ ok: boolean }>(`/api/trips/${id}`, { method: "DELETE" }),

  addParticipants: (tripId: string, people: Person[]) =>
    request<import("@/lib/types").Participant[]>(
      `/api/trips/${tripId}/participants`,
      {
        method: "POST",
        body: JSON.stringify({ people }),
      },
    ),
  deleteParticipant: (tripId: string, participantId: string) =>
    request<{ ok: boolean }>(
      `/api/trips/${tripId}/participants/${participantId}`,
      { method: "DELETE" },
    ),
  reorderParticipants: (tripId: string, orderedIds: string[]) =>
    request<{ ok: boolean; orderedIds: string[] }>(
      `/api/trips/${tripId}/participants`,
      {
        method: "PATCH",
        body: JSON.stringify({ orderedIds }),
      },
    ),

  getChangeRequests: () => request<ChangeRequest[]>("/api/change-requests"),
  createChangeRequest: (body: {
    personId: string;
    category: ChangeRequestCategory;
    body: string;
  }) =>
    request<ChangeRequest>("/api/change-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateChangeRequest: (
    id: string,
    body: { status: ChangeRequestStatus; resolvedOn?: string | null },
  ) =>
    request<ChangeRequest>(`/api/change-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteChangeRequest: (id: string) =>
    request<{ ok: boolean }>(`/api/change-requests/${id}`, {
      method: "DELETE",
    }),

  getChangelog: () => request<ChangelogItem[]>("/api/changelog"),
  createChangelogItem: (body: { date: string; body: string }) =>
    request<ChangelogItem>("/api/changelog", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateChangelogItem: (id: string, body: { date: string; body: string }) =>
    request<ChangelogItem>(`/api/changelog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteChangelogItem: (id: string) =>
    request<{ ok: boolean }>(`/api/changelog/${id}`, { method: "DELETE" }),

  saveReport: (
    participantId: string,
    form: ReportForm,
    status?: WriteStatus,
  ) =>
    request<{ ok: boolean; form: ReportForm }>(
      `/api/participants/${participantId}/report`,
      {
        method: "PUT",
        body: JSON.stringify({ form, status }),
      },
    ),
};
