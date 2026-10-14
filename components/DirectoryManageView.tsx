"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isResignedPerson } from "@/components/PersonNameLabel";
import { PersonExpensePanel } from "@/components/PersonExpensePanel";
import {
  RowDeleteButton,
  RowEditButton,
} from "@/components/RowActionIcons";
import type { EmploymentStatus, Person, Team, Trip } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

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

/** visible 목록 안에서 순서를 바꾼 뒤, 숨겨진 id는 원래 자리에 유지합니다. */
function reorderVisibleWithinFull(
  fullIds: string[],
  visibleIds: string[],
  activeId: string,
  overId: string,
): string[] {
  const oldIndex = visibleIds.indexOf(activeId);
  const newIndex = visibleIds.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return fullIds;
  const nextVisible = arrayMove(visibleIds, oldIndex, newIndex);
  let cursor = 0;
  return fullIds.map((id) =>
    visibleIds.includes(id) ? nextVisible[cursor++]! : id,
  );
}

function resolvePersonTeamId(personId: string, teams: Team[]): string {
  return teams.find((team) => team.memberIds.includes(personId))?.id ?? "";
}

function countActiveMembers(
  memberIds: string[],
  peopleById: Map<string, Person>,
): number {
  return memberIds.filter((id) => {
    const person = peopleById.get(id);
    return Boolean(person) && !isResignedPerson(person);
  }).length;
}

const inputClassName =
  "w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15";

function TeamRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <RowEditButton label="팀 수정" onClick={onEdit} />
      <RowDeleteButton label="팀 삭제" onClick={onDelete} />
    </div>
  );
}

function SortableTeamCard({
  team,
  selected,
  memberCount,
  disabled,
  onSelect,
  onEdit,
  onDelete,
}: {
  team: Team;
  selected: boolean;
  memberCount: number;
  disabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group relative overflow-hidden rounded-xl border ${
        isDragging
          ? "z-10 border-dashed border-[#B0B8C1] bg-[#F0F1F3] opacity-40"
          : selected
            ? "border-[#D1D6DB] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(25,31,40,0.12),0_2px_6px_rgba(25,31,40,0.10)]"
            : "border-transparent bg-[#F2F4F6] hover:bg-[#EBEDEF]"
      }`}
    >
      {selected && !isDragging ? (
        <span
          aria-hidden="true"
          className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-[#3182F6]"
        />
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onEdit}
        className={`w-full py-3 pr-16 pl-3 text-left ${
          disabled
            ? "cursor-pointer"
            : "cursor-grab touch-none active:cursor-grabbing"
        }`}
        {...attributes}
        {...(disabled ? {} : listeners)}
      >
        <p className="truncate text-[14px] font-bold text-[#191F28]">
          {team.name}{" "}
          <span className="font-medium text-[#8B95A1]">({memberCount}명)</span>
        </p>
      </button>
      {!isDragging ? (
        <TeamRowActions onEdit={onEdit} onDelete={onDelete} />
      ) : null}
    </div>
  );
}

function SortablePersonCard({
  person,
  selected,
  disabled,
  onSelect,
  onEdit,
}: {
  person: Person;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.id, disabled });
  const resigned = isResignedPerson(person);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group relative overflow-hidden rounded-xl border ${
        isDragging
          ? "z-10 border-dashed border-[#B0B8C1] bg-[#F0F1F3] opacity-40"
          : selected
            ? "border-[#D1D6DB] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(25,31,40,0.12),0_2px_6px_rgba(25,31,40,0.10)]"
            : "border-transparent bg-[#F2F4F6] hover:bg-[#EBEDEF]"
      }`}
    >
      {selected && !isDragging ? (
        <span
          aria-hidden="true"
          className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-[#3182F6]"
        />
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onEdit}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left ${
          disabled
            ? "cursor-pointer"
            : "cursor-grab touch-none active:cursor-grabbing"
        }`}
        {...attributes}
        {...(disabled ? {} : listeners)}
      >
        <p className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate text-[14px] font-bold text-[#191F28]">
            {person.name}
          </span>
          {person.rank ? (
            <span className="shrink-0 text-[13px] font-bold text-[#191F28]">
              {person.rank}
            </span>
          ) : null}
        </p>
        <div
          className={`relative flex w-[52px] shrink-0 items-center justify-end ${
            isDragging ? "" : "group-hover:pointer-events-none"
          }`}
        >
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-opacity ${
              isDragging ? "" : "group-hover:opacity-0"
            } ${
              resigned
                ? "bg-[#FFF5F6] text-[#F04452]"
                : "bg-[#F2F4F6] text-[#8B95A1]"
            }`}
          >
            {resigned ? "퇴사" : "재직"}
          </span>
        </div>
      </button>
      {!isDragging ? (
        <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <RowEditButton label="인원 수정" onClick={onEdit} />
        </div>
      ) : null}
    </div>
  );
}

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

  const personIdsWithTripHistory = useMemo(() => {
    const ids = new Set<string>();
    for (const trip of trips) {
      for (const participant of trip.participants) {
        if (participant.personId) ids.add(participant.personId);
      }
    }
    return ids;
  }, [trips]);

  const teamPanelTab: "all" | "byTeam" =
    selectedTeamId === "all" ? "all" : "byTeam";

  const orderedPeopleForView = useMemo(() => {
    if (selectedTeam) {
      return selectedTeam.memberIds
        .map((id) => peopleById.get(id))
        .filter((person): person is Person => Boolean(person));
    }

    // 전체 탭: people 전역 순서(sort_order)를 그대로 사용합니다.
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
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    const blockedIds = uniqueIds.filter((id) =>
      personIdsWithTripHistory.has(id),
    );
    const allowedIds = uniqueIds.filter(
      (id) => !personIdsWithTripHistory.has(id),
    );

    if (blockedIds.length > 0 && allowedIds.length === 0) {
      setDeleteTarget({
        type: "people-blocked",
        names: blockedIds.map(
          (id) => people.find((person) => person.id === id)?.name ?? id,
        ),
      });
      return;
    }

    setDeleteTarget({
      type: "people",
      ids: allowedIds,
      names: allowedIds.map(
        (id) => people.find((person) => person.id === id)?.name ?? id,
      ),
    });
  };

  const requestDeleteTeam = (team: Team) => {
    const blockedMemberIds = team.memberIds.filter((id) =>
      personIdsWithTripHistory.has(id),
    );
    if (blockedMemberIds.length > 0) {
      setDeleteTarget({
        type: "team-blocked",
        name: team.name,
        memberNames: blockedMemberIds.map(
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
    <div className="flex min-h-0 flex-1 flex-col bg-[#F2F4F6]">
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
              <h2 className="text-[22px] font-bold tracking-tight text-[#191F28]">
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
            {/* Teams panel */}
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white">
              <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-[#E5E8EB] px-4">
                <h3 className="text-[15px] font-bold text-[#191F28]">팀</h3>
                <button
                  type="button"
                  onClick={() => setTeamDraft({ name: "" })}
                  aria-label="팀 추가"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3182F6] text-lg font-bold leading-none text-white transition-colors hover:bg-[#1B64DA]"
                >
                  +
                </button>
              </header>

              <div className="flex h-[60px] shrink-0 items-end border-b border-[#E5E8EB] px-4">
                <div
                  className="flex h-full w-full"
                  role="tablist"
                  aria-label="팀 보기"
                >
                  {(
                    [
                      { id: "all" as const, label: "전체", onClick: selectAllTab },
                      {
                        id: "byTeam" as const,
                        label: "팀별",
                        onClick: selectByTeamTab,
                      },
                    ] as const
                  ).map((tab) => {
                    const active = teamPanelTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={tab.onClick}
                        className={`relative flex h-full flex-1 items-center justify-center px-2 text-[13px] font-bold transition-colors ${
                          active
                            ? "text-[#3182F6]"
                            : "text-[#8B95A1] hover:text-[#4E5968]"
                        }`}
                      >
                        {tab.label}
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-[#3182F6]"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`min-h-0 flex-1 px-3 pb-3 pt-3 ${
                  teamPanelTab === "all"
                    ? "flex flex-col overflow-hidden"
                    : "overflow-y-auto"
                }`}
              >
                {teamPanelTab === "all" ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl bg-[#F9FAFB] px-4 text-center">
                    <p className="text-[13px] font-semibold text-[#8B95A1]">
                      전체 인원
                    </p>
                    <p className="mt-2 text-[28px] font-bold tracking-tight text-[#191F28]">
                      {titlePeopleCount}
                      <span className="ml-0.5 text-[16px] font-bold text-[#8B95A1]">
                        명
                      </span>
                    </p>
                    <p className="mt-3 text-[12px] leading-5 text-[#8B95A1]">
                      오른쪽에서 모든 인원을
                      <br />
                      확인할 수 있습니다
                    </p>
                  </div>
                ) : teams.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[13px] text-[#8B95A1]">
                    등록된 팀이 없습니다
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleTeamDragStart}
                    onDragEnd={handleTeamDragEnd}
                    onDragCancel={() => setActiveTeamId(null)}
                  >
                    <SortableContext
                      items={teamIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2.5">
                        {teams.map((team) => (
                          <SortableTeamCard
                            key={team.id}
                            team={team}
                            selected={selectedTeamId === team.id}
                            memberCount={countActiveMembers(
                              team.memberIds,
                              peopleById,
                            )}
                            disabled={false}
                            onSelect={() => setSelectedTeamId(team.id)}
                            onEdit={() =>
                              setTeamDraft({ id: team.id, name: team.name })
                            }
                            onDelete={() => requestDeleteTeam(team)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                      {activeTeam ? (
                        <div className="overflow-hidden rounded-xl border border-[#E5E8EB] bg-white px-3 py-3 shadow-[0_8px_24px_rgba(25,31,40,0.16)]">
                          <p className="truncate text-[14px] font-bold text-[#191F28]">
                            {activeTeam.name}{" "}
                            <span className="font-medium text-[#8B95A1]">
                              (
                              {countActiveMembers(
                                activeTeam.memberIds,
                                peopleById,
                              )}
                              명)
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </section>

            {/* People panel */}
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white">
              <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-[#E5E8EB] px-4">
                <h3 className="min-w-0 truncate text-[15px] font-bold text-[#191F28]">
                  {selectedTeam ? selectedTeam.name : "전체 보기"}{" "}
                  <span className="font-medium text-[#8B95A1]">
                    ({titlePeopleCount}명)
                  </span>
                </h3>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#4E5968]">
                    <input
                      type="checkbox"
                      checked={showResigned}
                      onChange={(e) => setShowResigned(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#3182F6]"
                    />
                    퇴사자
                  </label>
                  <button
                    type="button"
                    onClick={openCreatePerson}
                    aria-label="인원 추가"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3182F6] text-lg font-bold leading-none text-white transition-colors hover:bg-[#1B64DA]"
                  >
                    +
                  </button>
                </div>
              </header>

              <div className="flex h-[60px] shrink-0 items-center border-b border-[#E5E8EB] px-4 py-3">
                <input
                  type="search"
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="이름, 직급, 소속팀 검색"
                  className="h-full w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3 text-[13px] outline-none transition focus:border-[#3182F6] focus:bg-white"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
                {visiblePeople.length === 0 ? (
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-12 text-center">
                    <p className="text-[14px] font-semibold text-[#4E5968]">
                      {selectedTeam
                        ? "이 팀에 속한 사람이 없습니다"
                        : "등록된 사람이 없습니다"}
                    </p>
                    <p className="mt-1 text-[12px] text-[#8B95A1]">
                      + 버튼으로 사람을 추가해 주세요
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handlePersonDragStart}
                    onDragEnd={handlePersonDragEnd}
                    onDragCancel={() => setActivePersonId(null)}
                  >
                    <SortableContext
                      items={visiblePersonIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2.5">
                        {visiblePeople.map((person) => (
                          <SortablePersonCard
                            key={person.id}
                            person={person}
                            selected={selectedPersonId === person.id}
                            disabled={!canReorderPeople}
                            onSelect={() => setSelectedPersonId(person.id)}
                            onEdit={() => openEditPerson(person)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                      {activePerson ? (
                        <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-[#E5E8EB] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(25,31,40,0.16)]">
                          <p className="flex min-w-0 flex-1 items-baseline gap-1.5">
                            <span className="truncate text-[14px] font-bold text-[#191F28]">
                              {activePerson.name}
                            </span>
                            {activePerson.rank ? (
                              <span className="shrink-0 text-[13px] font-bold text-[#191F28]">
                                {activePerson.rank}
                              </span>
                            ) : null}
                          </p>
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                              isResignedPerson(activePerson)
                                ? "bg-[#FFF5F6] text-[#F04452]"
                                : "bg-[#F2F4F6] text-[#8B95A1]"
                            }`}
                          >
                            {isResignedPerson(activePerson) ? "퇴사" : "재직"}
                          </span>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </section>

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

      {personDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-bold text-[#191F28]">
                {personDraft.id ? "사람 수정" : "사람 추가"}
              </h3>
              {personDraft.id &&
              personIdsWithTripHistory.has(personDraft.id) ? (
                <p className="max-w-[220px] text-right text-[12px] leading-5 font-medium text-[#8B95A1]">
                  출장 이력이 있어 삭제할 수 없습니다.
                  <br />
                  아래에서 퇴사 처리해 주세요.
                </p>
              ) : personDraft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!personDraft.id) return;
                    requestDeletePeople([personDraft.id]);
                  }}
                  className="rounded-xl bg-[#FFF5F6] px-3 py-1.5 text-[13px] font-bold text-[#F04452] transition-colors hover:bg-[#FFE5E7]"
                >
                  삭제
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
                  이름 <span className="text-[#F04452]">*</span>
                </label>
                <input
                  autoFocus
                  className={inputClassName}
                  value={personDraft.name}
                  onChange={(e) => {
                    setPersonDraft({ ...personDraft, name: e.target.value });
                    setPersonError("");
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
                  직급 <span className="text-[#F04452]">*</span>
                </label>
                <input
                  className={inputClassName}
                  value={personDraft.rank}
                  placeholder="예: 대리, 과장"
                  onChange={(e) => {
                    setPersonDraft({ ...personDraft, rank: e.target.value });
                    setPersonError("");
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
                  팀 <span className="text-[#F04452]">*</span>
                </label>
                {teams.length === 0 ? (
                  <div className="rounded-xl bg-[#FFF5F6] px-3.5 py-3 text-[13px] font-medium text-[#F04452]">
                    등록된 팀이 없습니다. 먼저 팀을 추가해 주세요.
                  </div>
                ) : (
                  <select
                    className={inputClassName}
                    value={personDraft.teamId}
                    onChange={(e) => {
                      setPersonDraft({
                        ...personDraft,
                        teamId: e.target.value,
                      });
                      setPersonError("");
                    }}
                  >
                    <option value="" disabled>
                      팀을 선택해 주세요
                    </option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {personDraft.id ? (
                <div className="rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#4E5968]">
                        재직 상태
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                        {personDraft.employmentStatus === "퇴사"
                          ? teams.some((team) => team.id === personDraft.teamId)
                            ? "퇴사 처리된 인원입니다. 복구하면 다시 선택할 수 있습니다."
                            : "소속 팀이 없습니다. 팀을 선택한 뒤 재직 복구해 주세요."
                          : "퇴사 처리해도 기존 출장 기록은 유지됩니다."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (personDraft.employmentStatus === "퇴사") {
                          const teamExists = teams.some(
                            (team) => team.id === personDraft.teamId,
                          );
                          if (!personDraft.teamId || !teamExists) {
                            setPersonDraft({
                              ...personDraft,
                              teamId: teamExists ? personDraft.teamId : "",
                            });
                            setPersonError(
                              teams.length === 0
                                ? "재직 복구하려면 먼저 팀을 등록해 주세요."
                                : "재직 복구하려면 현재 등록된 팀을 선택해 주세요.",
                            );
                            return;
                          }
                          setPersonError("");
                          setPersonDraft({
                            ...personDraft,
                            employmentStatus: "재직",
                          });
                          return;
                        }
                        setPersonDraft({
                          ...personDraft,
                          employmentStatus: "퇴사",
                        });
                      }}
                      className={`shrink-0 rounded-xl px-3 py-2 text-[13px] font-bold transition-colors ${
                        personDraft.employmentStatus === "퇴사"
                          ? "bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E8F3FF]"
                          : "bg-[#FFF5F6] text-[#F04452] hover:bg-[#FFE5E7]"
                      }`}
                    >
                      {personDraft.employmentStatus === "퇴사"
                        ? "재직 복구"
                        : "퇴사 처리"}
                    </button>
                  </div>
                  {personDraft.employmentStatus === "퇴사" ? (
                    <p className="mt-2 text-[12px] font-semibold text-[#F04452]">
                      현재: 퇴사
                    </p>
                  ) : null}
                </div>
              ) : null}
              {personError ? (
                <p className="text-[13px] font-medium text-[#F04452]">
                  {personError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSavePerson}
                disabled={teams.length === 0}
                className="rounded-xl bg-[#3182F6] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#1B64DA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonDraft(null);
                  setPersonError("");
                }}
                className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] hover:bg-[#E5E8EB]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {teamDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-[#191F28]">
              {teamDraft.id ? "팀 수정" : "팀 추가"}
            </h3>
            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
                팀명
              </label>
              <input
                autoFocus
                className={inputClassName}
                value={teamDraft.name}
                onChange={(e) =>
                  setTeamDraft({ ...teamDraft, name: e.target.value })
                }
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveTeam}
                className="rounded-xl bg-[#3182F6] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#1B64DA]"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setTeamDraft(null)}
                className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] hover:bg-[#E5E8EB]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            {deleteTarget.type === "people-blocked" ||
            deleteTarget.type === "team-blocked" ? (
              <>
                <h3 className="text-[17px] font-bold text-[#191F28]">
                  삭제할 수 없습니다
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#4E5968]">
                  {deleteTarget.type === "people-blocked" ? (
                    <>
                      <span className="font-semibold text-[#191F28]">
                        {deleteTarget.names.length === 1
                          ? deleteTarget.names[0]
                          : `${deleteTarget.names.slice(0, 3).join(", ")}${
                              deleteTarget.names.length > 3
                                ? ` 외 ${deleteTarget.names.length - 3}명`
                                : ""
                            }`}
                      </span>
                      은(는) 출장 이력이 있어 삭제할 수 없습니다.
                      <br />
                      사람 수정에서 퇴사 처리해 주세요.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-[#191F28]">
                        {deleteTarget.name}
                      </span>
                      팀에 출장 이력이 있는 인원이 있어 삭제할 수 없습니다.
                      <br />
                      <span className="font-semibold text-[#191F28]">
                        {deleteTarget.memberNames.length === 1
                          ? deleteTarget.memberNames[0]
                          : `${deleteTarget.memberNames.slice(0, 3).join(", ")}${
                              deleteTarget.memberNames.length > 3
                                ? ` 외 ${deleteTarget.memberNames.length - 3}명`
                                : ""
                            }`}
                      </span>
                      을(를) 다른 팀으로 옮기거나 퇴사 처리한 뒤 다시 시도해
                      주세요.
                    </>
                  )}
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="w-full rounded-xl bg-[#3182F6] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#1B64DA]"
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[17px] font-bold text-[#191F28]">
                  {deleteTarget.type === "people"
                    ? deleteTarget.ids.length > 1
                      ? `${deleteTarget.ids.length}명을 삭제할까요?`
                      : "사람을 삭제할까요?"
                    : "팀을 삭제할까요?"}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#4E5968]">
                  {deleteTarget.type === "people" ? (
                    deleteTarget.ids.length === 1 ? (
                      <>
                        <span className="font-semibold text-[#191F28]">
                          {deleteTarget.names[0]}
                        </span>
                        을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-[#191F28]">
                          {deleteTarget.names.slice(0, 3).join(", ")}
                          {deleteTarget.names.length > 3
                            ? ` 외 ${deleteTarget.names.length - 3}명`
                            : ""}
                        </span>
                        을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </>
                    )
                  ) : (
                    <>
                      <span className="font-semibold text-[#191F28]">
                        {deleteTarget.name}
                      </span>
                      을(를) 삭제합니다.
                    </>
                  )}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteTarget}
                    className="rounded-xl bg-[#F04452] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#D93A47]"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] hover:bg-[#E5E8EB]"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
