"use client";

import type { Dispatch, SetStateAction } from "react";
import { api } from "@/lib/api/client";
import type { Person, Team, Trip } from "@/lib/types";

type UseTripDirectoryActionsArgs = {
  people: Person[];
  teams: Team[];
  setPeople: Dispatch<SetStateAction<Person[]>>;
  setTeams: Dispatch<SetStateAction<Team[]>>;
  setTrips: Dispatch<SetStateAction<Trip[]>>;
  setError: Dispatch<SetStateAction<string>>;
};

/** 팀/인원 관리 모달에서 쓰는 디렉터리 CRUD·정렬 핸들러 */
export function useTripDirectoryActions({
  people,
  teams,
  setPeople,
  setTeams,
  setTrips,
  setError,
}: UseTripDirectoryActionsArgs) {
  const onAddPerson = async (person: Omit<Person, "id">, teamId: string) => {
    try {
      const created = await api.createPerson({
        ...person,
        teamId,
      });
      setPeople((prev) => [...prev, created]);
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;
          if (team.memberIds.includes(created.id)) return team;
          return {
            ...team,
            memberIds: [...team.memberIds, created.id],
          };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "인원 추가 실패");
    }
  };

  const onUpdatePerson = async (
    personId: string,
    next: Omit<Person, "id">,
    teamId: string,
  ) => {
    try {
      const updated = await api.updatePerson(personId, {
        name: next.name,
        rank: next.rank,
        department: next.department,
        employmentStatus: next.employmentStatus,
        teamId,
      });
      setPeople((prev) =>
        prev.map((person) => (person.id === personId ? updated : person)),
      );
      setTeams((prev) => {
        const currentTeam = prev.find((team) =>
          team.memberIds.includes(personId),
        );
        if (currentTeam?.id === teamId) {
          return prev;
        }

        return prev.map((team) => {
          const withoutPerson = team.memberIds.filter((id) => id !== personId);
          if (team.id === teamId) {
            return {
              ...team,
              memberIds: [...withoutPerson, personId],
            };
          }
          return { ...team, memberIds: withoutPerson };
        });
      });
      setTrips((prev) =>
        prev.map((trip) => ({
          ...trip,
          participants: trip.participants.map((participant) =>
            participant.personId === personId
              ? {
                  ...participant,
                  name: updated.name,
                  department: updated.department,
                }
              : participant,
          ),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "인원 수정 실패");
    }
  };

  const onDeletePerson = async (personId: string) => {
    try {
      await api.deletePerson(personId);
      setPeople((prev) => prev.filter((person) => person.id !== personId));
      setTeams((prev) =>
        prev.map((team) => ({
          ...team,
          memberIds: team.memberIds.filter((id) => id !== personId),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "인원 삭제 실패");
    }
  };

  const onAddTeam = async (team: Omit<Team, "id">) => {
    try {
      const created = await api.createTeam({
        name: team.name,
        memberIds: team.memberIds,
      });
      setTeams((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : "팀 추가 실패");
    }
  };

  const onUpdateTeam = async (teamId: string, next: Omit<Team, "id">) => {
    try {
      const updated = await api.updateTeam(teamId, {
        name: next.name,
        memberIds: next.memberIds,
      });
      setTeams((prev) =>
        prev.map((team) => (team.id === teamId ? updated : team)),
      );
      setPeople((prev) =>
        prev.map((person) =>
          next.memberIds.includes(person.id)
            ? { ...person, department: next.name }
            : person,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "팀 수정 실패");
    }
  };

  const onReorderTeams = async (orderedIds: string[]) => {
    const previous = teams;
    setTeams((prev) => {
      const byId = new Map(prev.map((team) => [team.id, team]));
      return orderedIds
        .map((id) => byId.get(id))
        .filter((team): team is (typeof prev)[number] => Boolean(team));
    });
    try {
      await api.reorderTeams(orderedIds);
    } catch (err) {
      setTeams(previous);
      setError(err instanceof Error ? err.message : "팀 순서 변경 실패");
    }
  };

  const onReorderTeamMembers = async (
    teamId: string,
    orderedMemberIds: string[],
  ) => {
    const previous = teams;
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, memberIds: orderedMemberIds } : team,
      ),
    );
    try {
      const target = previous.find((team) => team.id === teamId);
      if (!target) return;
      await api.updateTeam(teamId, {
        name: target.name,
        memberIds: orderedMemberIds,
      });
    } catch (err) {
      setTeams(previous);
      setError(err instanceof Error ? err.message : "팀원 순서 변경 실패");
    }
  };

  const onReorderPeople = async (orderedIds: string[]) => {
    const previous = people;
    setPeople((prev) => {
      const byId = new Map(prev.map((person) => [person.id, person]));
      return orderedIds
        .map((id) => byId.get(id))
        .filter((person): person is (typeof prev)[number] => Boolean(person));
    });
    try {
      await api.reorderPeople(orderedIds);
    } catch (err) {
      setPeople(previous);
      setError(err instanceof Error ? err.message : "인원 순서 변경 실패");
    }
  };

  const onDeleteTeam = async (teamId: string) => {
    try {
      await api.deleteTeam(teamId);
      setTeams((prev) => prev.filter((team) => team.id !== teamId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "팀 삭제 실패");
    }
  };

  return {
    onAddPerson,
    onUpdatePerson,
    onDeletePerson,
    onAddTeam,
    onUpdateTeam,
    onReorderTeams,
    onReorderTeamMembers,
    onReorderPeople,
    onDeleteTeam,
  };
}
