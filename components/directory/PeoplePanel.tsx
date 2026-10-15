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
import { isResignedPerson } from "@/components/PersonNameLabel";
import { SortablePersonCard } from "@/components/directory/SortablePersonCard";
import type { Person, Team } from "@/lib/types";

type PeoplePanelProps = {
  selectedTeam: Team | null;
  titlePeopleCount: number;
  showResigned: boolean;
  onShowResignedChange: (checked: boolean) => void;
  onOpenCreatePerson: () => void;
  peopleSearch: string;
  onPeopleSearchChange: (value: string) => void;
  visiblePeople: Person[];
  visiblePersonIds: string[];
  selectedPersonId: string;
  canReorderPeople: boolean;
  activePerson: Person | null;
  sensors: SensorDescriptor<SensorOptions>[];
  onSelectPerson: (personId: string) => void;
  onEditPerson: (person: Person) => void;
  onPersonDragStart: (event: DragStartEvent) => void;
  onPersonDragEnd: (event: DragEndEvent) => void;
  onPersonDragCancel: () => void;
};

export function PeoplePanel({
  selectedTeam,
  titlePeopleCount,
  showResigned,
  onShowResignedChange,
  onOpenCreatePerson,
  peopleSearch,
  onPeopleSearchChange,
  visiblePeople,
  visiblePersonIds,
  selectedPersonId,
  canReorderPeople,
  activePerson,
  sensors,
  onSelectPerson,
  onEditPerson,
  onPersonDragStart,
  onPersonDragEnd,
  onPersonDragCancel,
}: PeoplePanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-edge bg-surface">
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-edge px-4">
        <h3 className="min-w-0 truncate text-[15px] font-bold text-ink">
          {selectedTeam ? selectedTeam.name : "전체 보기"}{" "}
          <span className="font-medium text-ink-subtle">
            ({titlePeopleCount}명)
          </span>
        </h3>
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-ink-secondary">
            <input
              type="checkbox"
              checked={showResigned}
              onChange={(e) => onShowResignedChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            퇴사자
          </label>
          <button
            type="button"
            onClick={onOpenCreatePerson}
            aria-label="인원 추가"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-lg font-bold leading-none text-white transition-colors hover:bg-accent-hover"
          >
            +
          </button>
        </div>
      </header>

      <div className="flex h-[60px] shrink-0 items-center border-b border-edge px-4 py-3">
        <input
          type="search"
          value={peopleSearch}
          onChange={(e) => onPeopleSearchChange(e.target.value)}
          placeholder="이름, 직급, 소속팀 검색"
          className="h-full w-full rounded-xl border border-edge bg-surface-subtle px-3 text-[13px] outline-none transition focus:border-accent focus:bg-surface"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {visiblePeople.length === 0 ? (
          <div className="rounded-xl bg-surface-subtle px-4 py-12 text-center">
            <p className="text-[14px] font-semibold text-ink-secondary">
              {selectedTeam
                ? "이 팀에 속한 사람이 없습니다"
                : "등록된 사람이 없습니다"}
            </p>
            <p className="mt-1 text-[12px] text-ink-subtle">
              + 버튼으로 사람을 추가해 주세요
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onPersonDragStart}
            onDragEnd={onPersonDragEnd}
            onDragCancel={onPersonDragCancel}
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
                    onSelect={() => onSelectPerson(person.id)}
                    onEdit={() => onEditPerson(person)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activePerson ? (
                <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-edge bg-surface px-4 py-3 shadow-[0_8px_24px_rgba(25,31,40,0.16)]">
                  <p className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="truncate text-[14px] font-bold text-ink">
                      {activePerson.name}
                    </span>
                    {activePerson.rank ? (
                      <span className="shrink-0 text-[13px] font-bold text-ink">
                        {activePerson.rank}
                      </span>
                    ) : null}
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      isResignedPerson(activePerson)
                        ? "bg-danger-soft text-danger"
                        : "bg-surface-muted text-ink-subtle"
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
  );
}
