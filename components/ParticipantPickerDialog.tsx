"use client";

import { useMemo, useState } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import type { Person, Team } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

type PickerTab = "people" | "teams";

type ParticipantPickerDialogProps = {
  people: Person[];
  teams: Team[];
  existingPersonIds: string[];
  onConfirm: (people: Person[]) => void;
  onCancel: () => void;
};

export function ParticipantPickerDialog({
  people,
  teams,
  existingPersonIds,
  onConfirm,
  onCancel,
}: ParticipantPickerDialogProps) {
  const [tab, setTab] = useState<PickerTab>("people");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  const existingSet = useMemo(
    () => new Set(existingPersonIds),
    [existingPersonIds],
  );

  const activePeople = useMemo(
    () => people.filter((person) => !isResignedPerson(person)),
    [people],
  );

  const filteredPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activePeople;
    return activePeople.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.department.toLowerCase().includes(query),
    );
  }, [activePeople, searchQuery]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [teams, searchQuery]);

  const resolvedPeople = useMemo(() => {
    const ids = new Set<string>();
    if (tab === "people") {
      selectedPersonIds.forEach((id) => ids.add(id));
    } else {
      selectedTeamIds.forEach((teamId) => {
        const team = teams.find((item) => item.id === teamId);
        team?.memberIds.forEach((memberId) => ids.add(memberId));
      });
    }

    return [...ids]
      .map((id) => peopleById.get(id))
      .filter((person): person is Person => Boolean(person))
      .filter((person) => !existingSet.has(person.id))
      .filter((person) => !isResignedPerson(person));
  }, [
    tab,
    selectedPersonIds,
    selectedTeamIds,
    teams,
    peopleById,
    existingSet,
  ]);

  const togglePerson = (personId: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId],
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
  };

  useDialogKeyboard({
    confirmDisabled: resolvedPeople.length === 0,
    onConfirm: () => onConfirm(resolvedPeople),
    onCancel,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[80vh] w-full max-w-[520px] flex-col rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
        <h3 className="text-[17px] font-bold text-ink">참여자 추가</h3>
        <p className="mt-1 text-[13px] text-ink-subtle">
          사람 또는 팀 중 한 방식으로만 선택해 추가합니다. 탭을 바꾸면 이전
          선택은 초기화됩니다.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex rounded-xl bg-surface-muted p-1">
            {(
              [
                { value: "people", label: "사람" },
                { value: "teams", label: "팀" },
              ] as const
            ).map((option) => {
              const selected = tab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTab(option.value);
                    setSearchQuery("");
                    if (option.value === "people") {
                      setSelectedTeamIds([]);
                    } else {
                      setSelectedPersonIds([]);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
                    selected
                      ? "bg-surface text-accent shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                      : "text-ink-subtle hover:text-ink-secondary"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tab === "people" ? "이름, 소속 검색" : "팀명 검색"}
            className="h-9 flex-1 rounded-xl border border-edge bg-surface-subtle px-3 text-[13px] outline-none transition focus:border-accent focus:bg-surface"
          />
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-edge p-3">
          {tab === "people"
            ? filteredPeople.map((person) => {
                const alreadyAdded = existingSet.has(person.id);
                const checked = selectedPersonIds.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                      alreadyAdded
                        ? "cursor-not-allowed opacity-45"
                        : "cursor-pointer hover:bg-surface-subtle"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={alreadyAdded}
                      checked={checked || alreadyAdded}
                      onChange={() => togglePerson(person.id)}
                      className="h-4 w-4 accent-accent"
                    />
                    <PersonNameLabel
                      name={person.name}
                      resigned={isResignedPerson(person)}
                      className="text-[14px] font-semibold text-ink"
                    />
                    <span className="text-[12px] text-ink-subtle">
                      {person.department}
                    </span>
                    {alreadyAdded ? (
                      <span className="ml-auto text-[11px] font-semibold text-ink-subtle">
                        추가됨
                      </span>
                    ) : null}
                  </label>
                );
              })
            : filteredTeams.map((team) => {
                const checked = selectedTeamIds.includes(team.id);
                return (
                  <label
                    key={team.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-surface-subtle"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeam(team.id)}
                      className="mt-1 h-4 w-4 accent-accent"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink">
                        {team.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-subtle">
                        멤버{" "}
                        {
                          team.memberIds.filter((id) => {
                            const member = peopleById.get(id);
                            return member && !isResignedPerson(member);
                          }).length
                        }
                        명 ·{" "}
                        {team.memberIds
                          .map((id) => {
                            const member = peopleById.get(id);
                            if (!member || isResignedPerson(member)) return null;
                            return member.name;
                          })
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </label>
                );
              })}
        </div>

        <p className="mt-3 text-[13px] font-semibold text-ink-secondary">
          추가 예정{" "}
          <span className="text-accent">{resolvedPeople.length}</span>명
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={resolvedPeople.length === 0}
            onClick={() => onConfirm(resolvedPeople)}
            className="rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            확인
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-secondary transition-colors hover:bg-edge"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
