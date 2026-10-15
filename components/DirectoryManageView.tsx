"use client";

import { useMemo, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { isResignedPerson } from "@/components/PersonNameLabel";
import { PersonExpensePanel } from "@/components/PersonExpensePanel";
import { DirectoryDialogs } from "@/components/directory/DirectoryDialogs";
import { PeoplePanel } from "@/components/directory/PeoplePanel";
import { TeamPanel } from "@/components/directory/TeamPanel";
import {
  reorderVisibleWithinFull,
  resolvePersonTeamId,
} from "@/components/directory/directory-utils";
import {
  classifyPeopleDelete,
  classifyTeamDelete,
  collectPersonIdsWithTripHistory,
} from "@/lib/directory-delete-guards";
import type { EmploymentStatus, Person, Team, Trip } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";
import { uiPage } from "@/lib/ui-tokens";

type DirectoryManageViewProps = {
  people: Person[];
  teams: Team[];
  trips: Trip[];
  /** 모달 등 임베드 시 페이지형 타이틀/여백을 줄입니다. */
  embedded?: boolean;
  onRequestClose?: () => void;
  onAddPerson: (person: Omit<Person, "id">, teamId: string) => void;
  onUpdatePerson: (
    personId: string,
    person: Omit<Person, "id">,
    teamId: string,
  ) => void;
  onDeletePerson: (personId: string) => void;
  onAddTeam: (team: Omit<Team, "id">) => void | Promise<Team | void>;
  onUpdateTeam: (teamId: string, team: Omit<Team, "id">) => void;
  onReorderTeams: (orderedIds: string[]) => void;
  onReorderTeamMembers: (teamId: string, orderedMemberIds: string[]) => void;
  onReorderPeople: (orderedIds: string[]) => void;
  onDeleteTeam: (teamId: string) => void;
};

export function DirectoryManageView({
  people,
  teams,
  trips,
  embedded = false,
  onRequestClose,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onAddTeam,
  onUpdateTeam,
  onReorderTeams,
  onReorderTeamMembers,
  onReorderPeople,
  onDeleteTeam,
}: DirectoryManageViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | "all">("all");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [showResigned, setShowResigned] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [personDraft, setPersonDraft] = useState<{
    id?: string;
    name: string;
    rank: string;
    teamId: string;
    employmentStatus: EmploymentStatus;
  } | null>(null);
  const [personError, setPersonError] = useState("");
  const [teamDraft, setTeamDraft] = useState<{
    id?: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "people"; ids: string[]; names: string[] }
    | { type: "people-blocked"; names: string[] }
    | { type: "team"; id: string; name: string }
    | { type: "team-blocked"; name: string; memberNames: string[] }
    | null
  >(null);

  const selectedTeam =
    selectedTeamId === "all"
      ? null
      : (teams.find((team) => team.id === selectedTeamId) ?? null);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  const personIdsWithTripHistory = useMemo(
    () => collectPersonIdsWithTripHistory(trips),
    [trips],
  );

  const teamPanelTab: "all" | "byTeam" =
    selectedTeamId === "all" ? "all" : "byTeam";

  const orderedPeopleForView = useMemo(() => {
    if (selectedTeam) {
      return selectedTeam.memberIds
        .map((id) => peopleById.get(id))
        .filter((person): person is Person => Boolean(person));
    }

    // 전체 탭: people.sort_order (전역). 팀 탭은 team_members.sort_order.
    // → lib/directory-ordering.md
    return people;
  }, [people, peopleById, selectedTeam]);

  const visiblePeople = useMemo(() => {
    const byStatus = showResigned
      ? orderedPeopleForView
      : orderedPeopleForView.filter((person) => !isResignedPerson(person));

    const query = peopleSearch.trim().toLowerCase();
    if (!query) return byStatus;

    return byStatus.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.rank.toLowerCase().includes(query) ||
        person.department.toLowerCase().includes(query),
    );
  }, [orderedPeopleForView, peopleSearch, showResigned]);

  const titlePeopleCount = useMemo(() => {
    if (showResigned) return orderedPeopleForView.length;
    return orderedPeopleForView.filter(
      (person) => !isResignedPerson(person),
    ).length;
  }, [orderedPeopleForView, showResigned]);

  const canReorderPeople =
    peopleSearch.trim().length === 0 &&
    (Boolean(selectedTeam) || selectedTeamId === "all");

  const teamIds = useMemo(() => teams.map((team) => team.id), [teams]);
  const visiblePersonIds = useMemo(
    () => visiblePeople.map((person) => person.id),
    [visiblePeople],
  );

  const selectAllTab = () => {
    setSelectedTeamId("all");
  };

  const selectByTeamTab = () => {
    if (selectedTeamId !== "all") return;
    setSelectedTeamId(teams[0]?.id ?? "all");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeTeam = activeTeamId
    ? (teams.find((team) => team.id === activeTeamId) ?? null)
    : null;
  const activePerson = activePersonId
    ? (peopleById.get(activePersonId) ?? null)
    : null;

  const openCreatePerson = () => {
    const defaultTeamId = selectedTeamId !== "all" ? selectedTeamId : "";
    setPersonError("");
    setPersonDraft({
      name: "",
      rank: "",
      teamId: defaultTeamId,
      employmentStatus: "재직",
    });
  };

  const openEditPerson = (person: Person) => {
    setPersonError("");
    setPersonDraft({
      id: person.id,
      name: person.name,
      rank: person.rank,
      teamId: resolvePersonTeamId(person.id, teams),
      employmentStatus: person.employmentStatus ?? "재직",
    });
  };

  const requestDeletePeople = (ids: string[]) => {
    const classification = classifyPeopleDelete(
      ids,
      personIdsWithTripHistory,
    );
    if (
      classification.kind === "allow" &&
      classification.allowedIds.length === 0
    ) {
      return;
    }

    if (classification.kind === "blocked") {
      setDeleteTarget({
        type: "people-blocked",
        names: classification.blockedIds.map(
          (id) => people.find((person) => person.id === id)?.name ?? id,
        ),
      });
      return;
    }

    setDeleteTarget({
      type: "people",
      ids: classification.allowedIds,
      names: classification.allowedIds.map(
        (id) => people.find((person) => person.id === id)?.name ?? id,
      ),
    });
  };

  const requestDeleteTeam = (team: Team) => {
    const classification = classifyTeamDelete(
      team.memberIds,
      personIdsWithTripHistory,
    );
    if (classification.kind === "blocked") {
      setDeleteTarget({
        type: "team-blocked",
        name: team.name,
        memberNames: classification.blockedMemberIds.map(
          (id) => peopleById.get(id)?.name ?? id,
        ),
      });
      return;
    }

    setDeleteTarget({
      type: "team",
      id: team.id,
      name: team.name,
    });
  };

  const handleSavePerson = () => {
    if (!personDraft) return;
    const name = personDraft.name.trim();
    const rank = personDraft.rank.trim();

    if (!name) {
      setPersonError("이름을 입력해 주세요.");
      return;
    }

    if (!rank) {
      setPersonError("직급을 입력해 주세요.");
      return;
    }

    if (!personDraft.teamId) {
      setPersonError("팀을 선택해 주세요.");
      return;
    }

    const team = teams.find((item) => item.id === personDraft.teamId);
    if (!team) {
      setPersonError("선택한 팀이 유효하지 않습니다.");
      return;
    }

    const personPayload = {
      name,
      rank,
      department: team.name,
      employmentStatus: personDraft.employmentStatus ?? "재직",
      resignedAt: null as string | null,
    };

    if (personDraft.id) {
      onUpdatePerson(personDraft.id, personPayload, personDraft.teamId);
    } else {
      onAddPerson(
        { ...personPayload, employmentStatus: "재직" },
        personDraft.teamId,
      );
    }
    setPersonDraft(null);
    setPersonError("");
  };

  const handleSaveTeam = async () => {
    if (!teamDraft) return;
    const name = teamDraft.name.trim();
    if (!name) return;

    if (teamDraft.id) {
      const existing = teams.find((team) => team.id === teamDraft.id);
      onUpdateTeam(teamDraft.id, {
        name,
        memberIds: existing?.memberIds ?? [],
      });
    } else {
      const created = await onAddTeam({ name, memberIds: [] });
      if (created?.id) {
        setSelectedTeamId(created.id);
      }
    }
    setTeamDraft(null);
  };

  const handleConfirmDeleteTarget = () => {
    if (!deleteTarget) return;
    if (
      deleteTarget.type === "people-blocked" ||
      deleteTarget.type === "team-blocked"
    ) {
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.type === "people") {
      deleteTarget.ids.forEach((id) => onDeletePerson(id));
      if (deleteTarget.ids.includes(selectedPersonId)) {
        setSelectedPersonId("");
      }
      setPersonDraft(null);
      setPersonError("");
    } else {
      onDeleteTeam(deleteTarget.id);
      if (selectedTeamId === deleteTarget.id) {
        setSelectedTeamId("all");
      }
    }
    setDeleteTarget(null);
  };

  useDialogKeyboard({
    enabled: Boolean(personDraft) && !deleteTarget,
    confirmDisabled: teams.length === 0,
    onConfirm: handleSavePerson,
    onCancel: () => {
      setPersonDraft(null);
      setPersonError("");
    },
  });

  useDialogKeyboard({
    enabled: Boolean(teamDraft) && !deleteTarget,
    onConfirm: () => {
      void handleSaveTeam();
    },
    onCancel: () => setTeamDraft(null),
  });

  useDialogKeyboard({
    enabled: Boolean(deleteTarget),
    onConfirm: handleConfirmDeleteTarget,
    onCancel: () => setDeleteTarget(null),
  });

  useDialogKeyboard({
    enabled:
      Boolean(onRequestClose) &&
      !personDraft &&
      !teamDraft &&
      !deleteTarget,
    onCancel: onRequestClose,
  });

  const handleTeamDragStart = (event: DragStartEvent) => {
    setActiveTeamId(String(event.active.id));
  };

  const handleTeamDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTeamId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = teamIds.indexOf(String(active.id));
    const newIndex = teamIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    onReorderTeams(arrayMove(teamIds, oldIndex, newIndex));
  };

  const handlePersonDragStart = (event: DragStartEvent) => {
    if (!canReorderPeople) return;
    setActivePersonId(String(event.active.id));
  };

  const handlePersonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePersonId(null);
    if (!canReorderPeople || !over || active.id === over.id) {
      return;
    }

    if (selectedTeam) {
      // 팀별 탭 → team_members.sort_order 만 갱신
      const nextIds = reorderVisibleWithinFull(
        selectedTeam.memberIds,
        visiblePersonIds,
        String(active.id),
        String(over.id),
      );
      if (nextIds.every((id, index) => selectedTeam.memberIds[index] === id)) {
        return;
      }
      onReorderTeamMembers(selectedTeam.id, nextIds);
      return;
    }

    // 전체 탭 → people.sort_order 만 갱신
    const fullIds = people.map((person) => person.id);
    const nextIds = reorderVisibleWithinFull(
      fullIds,
      visiblePersonIds,
      String(active.id),
      String(over.id),
    );
    if (nextIds.every((id, index) => fullIds[index] === id)) {
      return;
    }
    onReorderPeople(nextIds);
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${uiPage}`}>
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          embedded ? "overflow-hidden p-3" : "overflow-y-auto px-6 py-8"
        }`}
      >
        <div
          className={`flex w-full flex-col ${
            embedded ? "min-h-0 flex-1" : "mx-auto max-w-[1280px]"
          }`}
        >
          {embedded ? null : (
            <div className="text-center">
              <h2 className="text-[22px] font-bold tracking-tight text-ink">
                팀/인원 관리
              </h2>
            </div>
          )}

          <div
            className={`grid ${
              embedded
                ? "h-full min-h-0 w-full grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1fr)] gap-3"
                : "mx-auto mt-8 h-[min(680px,calc(100vh-200px))] w-fit grid-cols-[300px_360px_320px] gap-4"
            }`}
          >
            <TeamPanel
              teams={teams}
              teamPanelTab={teamPanelTab}
              selectedTeamId={selectedTeamId}
              titlePeopleCount={titlePeopleCount}
              teamIds={teamIds}
              peopleById={peopleById}
              activeTeam={activeTeam}
              sensors={sensors}
              onSelectAllTab={selectAllTab}
              onSelectByTeamTab={selectByTeamTab}
              onOpenCreateTeam={() => setTeamDraft({ name: "" })}
              onSelectTeam={setSelectedTeamId}
              onEditTeam={(team) =>
                setTeamDraft({ id: team.id, name: team.name })
              }
              onDeleteTeam={requestDeleteTeam}
              onTeamDragStart={handleTeamDragStart}
              onTeamDragEnd={handleTeamDragEnd}
              onTeamDragCancel={() => setActiveTeamId(null)}
            />

            <PeoplePanel
              selectedTeam={selectedTeam}
              titlePeopleCount={titlePeopleCount}
              showResigned={showResigned}
              onShowResignedChange={setShowResigned}
              onOpenCreatePerson={openCreatePerson}
              peopleSearch={peopleSearch}
              onPeopleSearchChange={setPeopleSearch}
              visiblePeople={visiblePeople}
              visiblePersonIds={visiblePersonIds}
              selectedPersonId={selectedPersonId}
              canReorderPeople={canReorderPeople}
              activePerson={activePerson}
              sensors={sensors}
              onSelectPerson={setSelectedPersonId}
              onEditPerson={openEditPerson}
              onPersonDragStart={handlePersonDragStart}
              onPersonDragEnd={handlePersonDragEnd}
              onPersonDragCancel={() => setActivePersonId(null)}
            />

            <PersonExpensePanel
              person={
                selectedPersonId
                  ? (peopleById.get(selectedPersonId) ?? null)
                  : null
              }
              trips={trips}
              people={people}
            />
          </div>
        </div>
      </div>

      <DirectoryDialogs
        teams={teams}
        personDraft={personDraft}
        setPersonDraft={setPersonDraft}
        personError={personError}
        setPersonError={setPersonError}
        personIdsWithTripHistory={personIdsWithTripHistory}
        teamDraft={teamDraft}
        setTeamDraft={setTeamDraft}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        onSavePerson={handleSavePerson}
        onSaveTeam={() => {
          void handleSaveTeam();
        }}
        onConfirmDeleteTarget={handleConfirmDeleteTarget}
        onRequestDeletePeople={requestDeletePeople}
      />
    </div>
  );
}
