"use client";

import type { EmploymentStatus, Team } from "@/lib/types";

export const inputClassName =
  "w-full rounded-xl border border-edge bg-surface-subtle px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15";

export type PersonDraftState = {
  id?: string;
  name: string;
  rank: string;
  teamId: string;
  employmentStatus: EmploymentStatus;
};

export type TeamDraftState = {
  id?: string;
  name: string;
};

export type DeleteTargetState =
  | { type: "people"; ids: string[]; names: string[] }
  | { type: "people-blocked"; names: string[] }
  | { type: "team"; id: string; name: string }
  | { type: "team-blocked"; name: string; memberNames: string[] };

type DirectoryDialogsProps = {
  teams: Team[];
  personDraft: PersonDraftState | null;
  setPersonDraft: (draft: PersonDraftState | null) => void;
  personError: string;
  setPersonError: (error: string) => void;
  personIdsWithTripHistory: Set<string>;
  teamDraft: TeamDraftState | null;
  setTeamDraft: (draft: TeamDraftState | null) => void;
  deleteTarget: DeleteTargetState | null;
  setDeleteTarget: (target: DeleteTargetState | null) => void;
  onSavePerson: () => void;
  onSaveTeam: () => void;
  onConfirmDeleteTarget: () => void;
  onRequestDeletePeople: (ids: string[]) => void;
};

export function DirectoryDialogs({
  teams,
  personDraft,
  setPersonDraft,
  personError,
  setPersonError,
  personIdsWithTripHistory,
  teamDraft,
  setTeamDraft,
  deleteTarget,
  setDeleteTarget,
  onSavePerson,
  onSaveTeam,
  onConfirmDeleteTarget,
  onRequestDeletePeople,
}: DirectoryDialogsProps) {
  return (
    <>
      {personDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-bold text-ink">
                {personDraft.id ? "사람 수정" : "사람 추가"}
              </h3>
              {personDraft.id &&
              personIdsWithTripHistory.has(personDraft.id) ? (
                <p className="max-w-[220px] text-right text-[12px] leading-5 font-medium text-ink-subtle">
                  출장 이력이 있어 삭제할 수 없습니다.
                  <br />
                  아래에서 퇴사 처리해 주세요.
                </p>
              ) : personDraft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!personDraft.id) return;
                    onRequestDeletePeople([personDraft.id]);
                  }}
                  className="rounded-xl bg-danger-soft px-3 py-1.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger-soft-hover"
                >
                  삭제
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink-secondary">
                  이름 <span className="text-danger">*</span>
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
                <label className="mb-1.5 block text-[13px] font-semibold text-ink-secondary">
                  직급 <span className="text-danger">*</span>
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
                <label className="mb-1.5 block text-[13px] font-semibold text-ink-secondary">
                  팀 <span className="text-danger">*</span>
                </label>
                {teams.length === 0 ? (
                  <div className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger">
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
                <div className="rounded-xl border border-edge bg-surface-subtle px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-ink-secondary">
                        재직 상태
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-subtle">
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
                          ? "bg-selected text-accent hover:bg-selected-hover"
                          : "bg-danger-soft text-danger hover:bg-danger-soft-hover"
                      }`}
                    >
                      {personDraft.employmentStatus === "퇴사"
                        ? "재직 복구"
                        : "퇴사 처리"}
                    </button>
                  </div>
                  {personDraft.employmentStatus === "퇴사" ? (
                    <p className="mt-2 text-[12px] font-semibold text-danger">
                      현재: 퇴사
                    </p>
                  ) : null}
                </div>
              ) : null}
              {personError ? (
                <p className="text-[13px] font-medium text-danger">
                  {personError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSavePerson}
                disabled={teams.length === 0}
                className="rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonDraft(null);
                  setPersonError("");
                }}
                className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-secondary hover:bg-edge"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {teamDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-ink">
              {teamDraft.id ? "팀 수정" : "팀 추가"}
            </h3>
            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-secondary">
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
                onClick={onSaveTeam}
                className="rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white hover:bg-accent-hover"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setTeamDraft(null)}
                className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-secondary hover:bg-edge"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            {deleteTarget.type === "people-blocked" ||
            deleteTarget.type === "team-blocked" ? (
              <>
                <h3 className="text-[17px] font-bold text-ink">
                  삭제할 수 없습니다
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
                  {deleteTarget.type === "people-blocked" ? (
                    <>
                      <span className="font-semibold text-ink">
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
                      <span className="font-semibold text-ink">
                        {deleteTarget.name}
                      </span>
                      팀에 출장 이력이 있는 인원이 있어 삭제할 수 없습니다.
                      <br />
                      <span className="font-semibold text-ink">
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
                    className="w-full rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white hover:bg-accent-hover"
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[17px] font-bold text-ink">
                  {deleteTarget.type === "people"
                    ? deleteTarget.ids.length > 1
                      ? `${deleteTarget.ids.length}명을 삭제할까요?`
                      : "사람을 삭제할까요?"
                    : "팀을 삭제할까요?"}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
                  {deleteTarget.type === "people" ? (
                    deleteTarget.ids.length === 1 ? (
                      <>
                        <span className="font-semibold text-ink">
                          {deleteTarget.names[0]}
                        </span>
                        을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-ink">
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
                      <span className="font-semibold text-ink">
                        {deleteTarget.name}
                      </span>
                      을(를) 삭제합니다.
                    </>
                  )}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onConfirmDeleteTarget}
                    className="rounded-xl bg-danger px-4 py-3 text-[14px] font-bold text-white hover:bg-danger-hover"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-secondary hover:bg-edge"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
