"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Person, Team } from "@/lib/types";
import { countActiveMembers } from "@/components/directory/directory-utils";
import { SortableTeamCard } from "@/components/directory/SortableTeamCard";

type TeamPanelProps = {
  teams: Team[];
  teamPanelTab: "all" | "byTeam";
  selectedTeamId: string | "all";
  titlePeopleCount: number;
  teamIds: string[];
  peopleById: Map<string, Person>;
  activeTeam: Team | null;
  sensors: SensorDescriptor<SensorOptions>[];
  onSelectAllTab: () => void;
  onSelectByTeamTab: () => void;
  onOpenCreateTeam: () => void;
  onSelectTeam: (teamId: string) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  onTeamDragStart: (event: DragStartEvent) => void;
  onTeamDragEnd: (event: DragEndEvent) => void;
  onTeamDragCancel: () => void;
};

export function TeamPanel({
  teams,
  teamPanelTab,
  selectedTeamId,
  titlePeopleCount,
  teamIds,
  peopleById,
  activeTeam,
  sensors,
  onSelectAllTab,
  onSelectByTeamTab,
  onOpenCreateTeam,
  onSelectTeam,
  onEditTeam,
  onDeleteTeam,
  onTeamDragStart,
  onTeamDragEnd,
  onTeamDragCancel,
}: TeamPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-edge bg-surface">
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-edge px-4">
        <h3 className="text-[15px] font-bold text-ink">팀</h3>
        <button
          type="button"
          onClick={onOpenCreateTeam}
          aria-label="팀 추가"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-lg font-bold leading-none text-white transition-colors hover:bg-accent-hover"
        >
          +
        </button>
      </header>

      <div className="flex h-[60px] shrink-0 items-end border-b border-edge px-4">
        <div className="flex h-full w-full" role="tablist" aria-label="팀 보기">
          {(
            [
              { id: "all" as const, label: "전체", onClick: onSelectAllTab },
              {
                id: "byTeam" as const,
                label: "팀별",
                onClick: onSelectByTeamTab,
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
                    ? "text-accent"
                    : "text-ink-subtle hover:text-ink-secondary"
                }`}
              >
                {tab.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-accent"
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
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl bg-surface-subtle px-4 text-center">
            <p className="text-[13px] font-semibold text-ink-subtle">
              전체 인원
            </p>
            <p className="mt-2 text-[28px] font-bold tracking-tight text-ink">
              {titlePeopleCount}
              <span className="ml-0.5 text-[16px] font-bold text-ink-subtle">
                명
              </span>
            </p>
            <p className="mt-3 text-[12px] leading-5 text-ink-subtle">
              오른쪽에서 모든 인원을
              <br />
              확인할 수 있습니다
            </p>
          </div>
        ) : teams.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-ink-subtle">
            등록된 팀이 없습니다
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onTeamDragStart}
            onDragEnd={onTeamDragEnd}
            onDragCancel={onTeamDragCancel}
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
                    onSelect={() => onSelectTeam(team.id)}
                    onEdit={() => onEditTeam(team)}
                    onDelete={() => onDeleteTeam(team)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeTeam ? (
                <div className="overflow-hidden rounded-xl border border-edge bg-surface px-3 py-3 shadow-[0_8px_24px_rgba(25,31,40,0.16)]">
                  <p className="truncate text-[14px] font-bold text-ink">
                    {activeTeam.name}{" "}
                    <span className="font-medium text-ink-subtle">
                      (
                      {countActiveMembers(activeTeam.memberIds, peopleById)}
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
  );
}
