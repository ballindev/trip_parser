"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Person, Team } from "@/lib/types";

type DirectoryManageViewProps = {
  people: Person[];
  teams: Team[];
  onAddPerson: (person: Omit<Person, "id">, teamId: string) => void;
  onUpdatePerson: (
    personId: string,
    person: Omit<Person, "id">,
    teamId: string,
  ) => void;
  onDeletePerson: (personId: string) => void;
  onAddTeam: (team: Omit<Team, "id">) => void;
  onUpdateTeam: (teamId: string, team: Omit<Team, "id">) => void;
  onDeleteTeam: (teamId: string) => void;
};

function resolvePersonTeamId(personId: string, teams: Team[]): string {
  return teams.find((team) => team.memberIds.includes(personId))?.id ?? "";
}

const inputClassName =
  "w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-2.5 text-[14px] text-[#191F28] outline-none transition focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15";

function IconButton({
  label,
  onClick,
  disabled,
  variant = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg font-bold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "primary"
          ? "bg-[#3182F6] text-white hover:bg-[#1B64DA] disabled:hover:bg-[#3182F6]"
          : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#FFE5E7] hover:text-[#F04452] disabled:hover:bg-[#F2F4F6] disabled:hover:text-[#4E5968]"
      }`}
    >
      {children}
    </button>
  );
}

export function DirectoryManageView({
  people,
  teams,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
}: DirectoryManageViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | "all">("all");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [personDeleteMode, setPersonDeleteMode] = useState(false);
  const [checkedPersonIds, setCheckedPersonIds] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [personDraft, setPersonDraft] = useState<{
    id?: string;
    name: string;
    teamId: string;
  } | null>(null);
  const [personError, setPersonError] = useState("");
  const [teamDraft, setTeamDraft] = useState<{
    id?: string;
    name: string;
    memberIds: string[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "people"; ids: string[]; names: string[] }
    | { type: "team"; id: string; name: string }
    | null
  >(null);

  const selectedTeam =
    selectedTeamId === "all"
      ? null
      : (teams.find((team) => team.id === selectedTeamId) ?? null);

  const filteredTeams = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [teams, teamSearch]);

  const visiblePeople = useMemo(() => {
    const base =
      selectedTeamId === "all"
        ? people
        : people.filter((person) =>
            selectedTeam?.memberIds.includes(person.id),
          );

    const query = peopleSearch.trim().toLowerCase();
    if (!query) return base;

    return base.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.department.toLowerCase().includes(query),
    );
  }, [people, peopleSearch, selectedTeam, selectedTeamId]);

  const teamMembership = useMemo(() => {
    const map = new Map<string, string[]>();
    teams.forEach((team) => {
      team.memberIds.forEach((memberId) => {
        const current = map.get(memberId) ?? [];
        current.push(team.name);
        map.set(memberId, current);
      });
    });
    return map;
  }, [teams]);

  const exitPersonDeleteMode = () => {
    setPersonDeleteMode(false);
    setCheckedPersonIds([]);
  };

  const openCreatePerson = () => {
    if (personDeleteMode) exitPersonDeleteMode();
    const defaultTeamId = selectedTeamId !== "all" ? selectedTeamId : "";
    setPersonError("");
    setPersonDraft({ name: "", teamId: defaultTeamId });
  };

  const openEditPerson = (person: Person) => {
    if (personDeleteMode) exitPersonDeleteMode();
    setPersonError("");
    setPersonDraft({
      id: person.id,
      name: person.name,
      teamId: resolvePersonTeamId(person.id, teams),
    });
  };

  const toggleCheckedPerson = (personId: string) => {
    setCheckedPersonIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  };

  const requestDeletePeople = (ids: string[]) => {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    const names = uniqueIds.map(
      (id) => people.find((person) => person.id === id)?.name ?? id,
    );
    setDeleteTarget({ type: "people", ids: uniqueIds, names });
  };

  const handleSavePerson = () => {
    if (!personDraft) return;
    const name = personDraft.name.trim();

    if (!name) {
      setPersonError("이름을 입력해 주세요.");
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

    const personPayload = { name, department: team.name };

    if (personDraft.id) {
      onUpdatePerson(personDraft.id, personPayload, personDraft.teamId);
    } else {
      onAddPerson(personPayload, personDraft.teamId);
    }
    setPersonDraft(null);
    setPersonError("");
  };

  const handleSaveTeam = () => {
    if (!teamDraft) return;
    const name = teamDraft.name.trim();
    if (!name) return;

    if (teamDraft.id) {
      onUpdateTeam(teamDraft.id, {
        name,
        memberIds: teamDraft.memberIds,
      });
    } else {
      onAddTeam({ name, memberIds: teamDraft.memberIds });
    }
    setTeamDraft(null);
  };

  const handleDeleteSelectedTeam = () => {
    if (!selectedTeam) return;
    setDeleteTarget({
      type: "team",
      id: selectedTeam.id,
      name: selectedTeam.name,
    });
  };

  const handlePersonMinusClick = () => {
    setPersonDeleteMode(true);
    setCheckedPersonIds(
      selectedPersonId && visiblePeople.some((p) => p.id === selectedPersonId)
        ? [selectedPersonId]
        : [],
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#F2F4F6]">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col">
          <div className="text-center">
            <h2 className="text-[22px] font-bold tracking-tight text-[#191F28]">
              인원/팀 관리
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#8B95A1]">
              +/− 로 추가·삭제하고, 사람을 더블클릭하면 수정하거나 삭제할 수
              있습니다.
            </p>
          </div>

          <div className="mt-8 grid min-h-[560px] grid-cols-[320px_minmax(0,1fr)] gap-4">
            {/* Teams panel */}
            <section className="flex flex-col rounded-2xl border border-[#E5E8EB] bg-white">
              <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-[#E5E8EB] px-4">
                <h3 className="text-[15px] font-bold text-[#191F28]">팀</h3>
                <div className="flex items-center gap-1.5">
                  <IconButton
                    label="팀 추가"
                    variant="primary"
                    onClick={() =>
                      setTeamDraft({ name: "", memberIds: [] })
                    }
                  >
                    +
                  </IconButton>
                  <IconButton
                    label="팀 삭제"
                    disabled={!selectedTeam}
                    onClick={handleDeleteSelectedTeam}
                  >
                    −
                  </IconButton>
                </div>
              </header>

              <div className="h-[60px] shrink-0 px-4 py-3">
                <input
                  type="search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="팀명 검색"
                  className="h-full w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3 text-[13px] outline-none transition focus:border-[#3182F6] focus:bg-white"
                />
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedTeamId("all")}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                    selectedTeamId === "all"
                      ? "border-[#3182F6] bg-[#F2F8FF]"
                      : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
                  }`}
                >
                  <p className="text-[14px] font-bold text-[#191F28]">
                    전체 인원
                  </p>
                  <p className="mt-1 text-[12px] text-[#8B95A1]">
                    {people.length}명
                  </p>
                </button>

                {filteredTeams.map((team) => {
                  const selected = selectedTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeamId(team.id)}
                      onDoubleClick={() =>
                        setTeamDraft({
                          id: team.id,
                          name: team.name,
                          memberIds: team.memberIds,
                        })
                      }
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                        selected
                          ? "border-[#3182F6] bg-[#F2F8FF]"
                          : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      <p className="truncate text-[14px] font-bold text-[#191F28]">
                        {team.name}
                      </p>
                      <p className="mt-1 text-[12px] text-[#8B95A1]">
                        멤버 {team.memberIds.length}명
                      </p>
                    </button>
                  );
                })}

                {filteredTeams.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[13px] text-[#8B95A1]">
                    검색된 팀이 없습니다
                  </p>
                ) : null}
              </div>
            </section>

            {/* People panel */}
            <section className="flex flex-col rounded-2xl border border-[#E5E8EB] bg-white">
              <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-[#E5E8EB] px-4">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-bold text-[#191F28]">
                    {selectedTeam ? selectedTeam.name : "전체 인원"}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {personDeleteMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => requestDeletePeople(checkedPersonIds)}
                        disabled={checkedPersonIds.length === 0}
                        className="rounded-xl bg-[#F04452] px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-[#D93A47] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        삭제
                        {checkedPersonIds.length > 0
                          ? ` ${checkedPersonIds.length}`
                          : ""}
                      </button>
                      <button
                        type="button"
                        onClick={exitPersonDeleteMode}
                        className="rounded-xl bg-[#F2F4F6] px-3 py-1.5 text-[13px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <IconButton
                        label="사람 추가"
                        variant="primary"
                        onClick={openCreatePerson}
                      >
                        +
                      </IconButton>
                      <IconButton
                        label="사람 삭제"
                        disabled={visiblePeople.length === 0}
                        onClick={handlePersonMinusClick}
                      >
                        −
                      </IconButton>
                    </>
                  )}
                </div>
              </header>

              <div className="h-[60px] shrink-0 px-4 py-3">
                <div className="flex h-full items-center gap-3">
                  <input
                    type="search"
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="이름, 소속팀 검색"
                    className="h-full min-w-0 flex-1 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3 text-[13px] outline-none transition focus:border-[#3182F6] focus:bg-white"
                  />
                  <div className="flex h-full shrink-0 items-center rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3">
                    <p className="text-[13px] font-semibold text-[#4E5968]">
                      {personDeleteMode ? (
                        <>
                          선택{" "}
                          <span className="font-bold text-[#F04452]">
                            {checkedPersonIds.length}
                          </span>
                          명
                        </>
                      ) : (
                        <>
                          인원{" "}
                          <span className="font-bold text-[#3182F6]">
                            {visiblePeople.length}
                          </span>
                          명
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {personDeleteMode ? (
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
                  <p className="text-[12px] font-medium text-[#8B95A1]">
                    삭제할 사람을 선택하세요
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const visibleIds = visiblePeople.map((p) => p.id);
                      const allChecked = visibleIds.every((id) =>
                        checkedPersonIds.includes(id),
                      );
                      setCheckedPersonIds(
                        allChecked
                          ? checkedPersonIds.filter(
                              (id) => !visibleIds.includes(id),
                            )
                          : [
                              ...new Set([
                                ...checkedPersonIds,
                                ...visibleIds,
                              ]),
                            ],
                      );
                    }}
                    disabled={visiblePeople.length === 0}
                    className="text-[12px] font-bold text-[#3182F6] disabled:opacity-40"
                  >
                    {visiblePeople.length > 0 &&
                    visiblePeople.every((p) =>
                      checkedPersonIds.includes(p.id),
                    )
                      ? "전체 해제"
                      : "전체 선택"}
                  </button>
                </div>
              ) : null}

              <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                {visiblePeople.map((person) => {
                  const belonging = teamMembership.get(person.id) ?? [];
                  const selected = selectedPersonId === person.id;
                  const checked = checkedPersonIds.includes(person.id);

                  if (personDeleteMode) {
                    return (
                      <label
                        key={person.id}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          checked
                            ? "border-[#F04452] bg-[#FFF5F6]"
                            : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckedPerson(person.id)}
                          className="h-4 w-4 shrink-0 accent-[#F04452]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold text-[#191F28]">
                            {person.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[#8B95A1]">
                            {person.department}
                            {belonging.length > 0
                              ? ` · ${belonging.join(", ")}`
                              : ""}
                          </span>
                        </span>
                      </label>
                    );
                  }

                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setSelectedPersonId(person.id)}
                      onDoubleClick={() => openEditPerson(person)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        selected
                          ? "border-[#3182F6] bg-[#F2F8FF]"
                          : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      <p className="truncate text-[14px] font-bold text-[#191F28]">
                        {person.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                        {person.department}
                        {belonging.length > 0
                          ? ` · ${belonging.join(", ")}`
                          : ""}
                      </p>
                    </button>
                  );
                })}

                {visiblePeople.length === 0 ? (
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-12 text-center">
                    <p className="text-[14px] font-semibold text-[#4E5968]">
                      {selectedTeam
                        ? "이 팀에 속한 사람이 없습니다"
                        : "등록된 사람이 없습니다"}
                    </p>
                    <p className="mt-1 text-[12px] text-[#8B95A1]">
                      {selectedTeam
                        ? "팀을 더블클릭해 멤버를 구성해 주세요"
                        : "+ 버튼으로 사람을 추가해 주세요"}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
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
              {personDraft.id ? (
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
                  이름
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
          <div className="flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-[#191F28]">
              {teamDraft.id ? "팀 수정" : "팀 추가"}
            </h3>
            <div className="mt-5 space-y-4 overflow-y-auto">
              <div>
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
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#4E5968]">
                  멤버 선택
                </label>
                <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-xl border border-[#E5E8EB] p-3">
                  {people.map((person) => {
                    const checked = teamDraft.memberIds.includes(person.id);
                    return (
                      <label
                        key={person.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F9FAFB]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setTeamDraft({
                              ...teamDraft,
                              memberIds: checked
                                ? teamDraft.memberIds.filter(
                                    (id) => id !== person.id,
                                  )
                                : [...teamDraft.memberIds, person.id],
                            });
                          }}
                          className="h-4 w-4 accent-[#3182F6]"
                        />
                        <span className="text-[14px] font-semibold text-[#191F28]">
                          {person.name}
                        </span>
                        <span className="text-[12px] text-[#8B95A1]">
                          {person.department}
                        </span>
                      </label>
                    );
                  })}
                  {people.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[#8B95A1]">
                      먼저 사람을 등록해 주세요
                    </p>
                  ) : null}
                </div>
              </div>
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
                    을(를) 삭제합니다.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-[#191F28]">
                      {deleteTarget.names.slice(0, 3).join(", ")}
                      {deleteTarget.names.length > 3
                        ? ` 외 ${deleteTarget.names.length - 3}명`
                        : ""}
                    </span>
                    을(를) 삭제합니다.
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
                onClick={() => {
                  if (deleteTarget.type === "people") {
                    deleteTarget.ids.forEach((id) => onDeletePerson(id));
                    if (deleteTarget.ids.includes(selectedPersonId)) {
                      setSelectedPersonId("");
                    }
                    setPersonDraft(null);
                    setPersonError("");
                    exitPersonDeleteMode();
                  } else {
                    onDeleteTeam(deleteTarget.id);
                    if (selectedTeamId === deleteTarget.id) {
                      setSelectedTeamId("all");
                    }
                  }
                  setDeleteTarget(null);
                }}
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
