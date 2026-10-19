"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import { RowDeleteButton } from "@/components/RowActionIcons";
import { StatusBadge } from "@/components/StatusBadge";
import { listCardClassName } from "@/lib/list-card-styles";
import type { Participant, Person } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";
import { uiPanel, uiPanelHeader } from "@/lib/ui-tokens";

type ParticipantListPanelProps = {
  participants: Participant[];
  people?: Person[];
  selectedParticipantId: string;
  onSelectParticipant: (participantId: string) => void;
  onAddParticipant: () => void;
  onDeleteParticipant: (participantId: string) => void;
  onReorderParticipants: (orderedIds: string[]) => void;
  arrivalToken?: number;
};

function ParticipantCardContent({
  participant,
  resigned,
  selected,
  fadeStatusOnHover = false,
}: {
  participant: Participant;
  resigned: boolean;
  selected: boolean;
  fadeStatusOnHover?: boolean;
}) {
  return (
    <>
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-accent"
        />
      ) : null}
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0 flex-1">
          <PersonNameLabel
            name={participant.name}
            resigned={resigned}
            className="block truncate text-[14px] font-bold text-ink"
          />
          <p className="mt-0.5 truncate text-[11px] text-ink-subtle">
            {participant.department}
          </p>
        </div>
        <div
          className={`flex h-7 w-[52px] shrink-0 items-center justify-end transition-opacity ${
            fadeStatusOnHover
              ? "group-hover:pointer-events-none group-hover:opacity-0"
              : ""
          }`}
        >
          <StatusBadge status={participant.status} />
        </div>
      </div>
    </>
  );
}

function SortableParticipantCard({
  participant,
  resigned,
  selected,
  highlightToken,
  onSelect,
  onDelete,
}: {
  participant: Participant;
  resigned: boolean;
  selected: boolean;
  highlightToken?: number;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      id={`participant-card-${participant.id}`}
      style={style}
      className={listCardClassName({ selected, isDragging })}
    >
      {highlightToken ? (
        <span
          key={highlightToken}
          aria-hidden="true"
          className="arrival-flash pointer-events-none absolute inset-0 z-0"
        />
      ) : null}
      <button
        type="button"
        className="relative z-10 w-full cursor-grab touch-none text-left active:cursor-grabbing"
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        <ParticipantCardContent
          participant={participant}
          resigned={resigned}
          selected={selected && !isDragging}
          fadeStatusOnHover={!isDragging}
        />
      </button>
      {!isDragging ? (
        <div className="pointer-events-none absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <RowDeleteButton label="참여자 삭제" onClick={onDelete} />
        </div>
      ) : null}
    </div>
  );
}

export function ParticipantListPanel({
  participants,
  people = [],
  selectedParticipantId,
  onSelectParticipant,
  onAddParticipant,
  onDeleteParticipant,
  onReorderParticipants,
  arrivalToken,
}: ParticipantListPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  const participantIds = useMemo(
    () => participants.map((participant) => participant.id),
    [participants],
  );

  const completedCount = useMemo(
    () =>
      participants.filter((participant) => participant.status === "완료")
        .length,
    [participants],
  );

  useEffect(() => {
    if (!arrivalToken || !selectedParticipantId) return;
    document
      .getElementById(`participant-card-${selectedParticipantId}`)
      ?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [arrivalToken, selectedParticipantId]);

  const isParticipantResigned = (participant: Participant) => {
    if (!participant.personId) return false;
    return isResignedPerson(peopleById.get(participant.personId));
  };

  const activeParticipant = activeId
    ? (participants.find((participant) => participant.id === activeId) ?? null)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteParticipant(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  useDialogKeyboard({
    enabled: Boolean(deleteTarget),
    onConfirm: handleConfirmDelete,
    onCancel: handleCancelDelete,
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = participantIds.indexOf(String(active.id));
    const newIndex = participantIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    onReorderParticipants(arrayMove(participantIds, oldIndex, newIndex));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <aside
      className={`relative flex h-full w-[10%] min-w-[140px] flex-col overflow-hidden ${uiPanel}`}
    >
      <header
        className={`flex h-[56px] shrink-0 items-center justify-between gap-2 ${uiPanelHeader} px-3`}
      >
        <h2 className="min-w-0 truncate text-[15px] font-bold tracking-tight text-ink">
          참여자{" "}
          <span className="font-medium text-ink-subtle">
            ({participants.length}명)
          </span>
        </h2>
        <button
          type="button"
          onClick={onAddParticipant}
          aria-label="인원 추가"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold leading-none text-white transition-colors hover:bg-accent-hover"
        >
          +
        </button>
      </header>

      <div className="h-[60px] shrink-0 px-3 py-3">
        <div className="flex h-full items-center justify-center rounded-xl border border-edge bg-surface px-3 shadow-sm">
          <p className="text-[13px] font-semibold text-ink-subtle">
            완료{" "}
            <span className="font-bold text-accent">{completedCount}</span>
            <span className="text-ink-subtle">/{participants.length}</span>
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
        {participants.length === 0 ? (
          <div className="rounded-2xl border border-edge bg-surface px-3 py-6 text-center shadow-sm">
            <p className="text-[12px] font-semibold text-ink-subtle">
              참여자가 없습니다
            </p>
            <p className="mt-1 text-[11px] text-ink-subtle">
              + 버튼으로 추가해 주세요
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={participantIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {participants.map((participant) => (
                  <SortableParticipantCard
                    key={participant.id}
                    participant={participant}
                    resigned={isParticipantResigned(participant)}
                    selected={participant.id === selectedParticipantId}
                    highlightToken={
                      participant.id === selectedParticipantId
                        ? arrivalToken
                        : undefined
                    }
                    onSelect={() => onSelectParticipant(participant.id)}
                    onDelete={() => setDeleteTarget(participant)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeParticipant ? (
                <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-[0_8px_24px_rgba(25,31,40,0.16)]">
                  <ParticipantCardContent
                    participant={activeParticipant}
                    resigned={isParticipantResigned(activeParticipant)}
                    selected={activeParticipant.id === selectedParticipantId}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-participant-title"
            className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          >
            <h3
              id="delete-participant-title"
              className="text-[17px] font-bold text-ink"
            >
              인원을 삭제할까요?
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-ink-subtle">
              <PersonNameLabel
                name={deleteTarget.name}
                resigned={isParticipantResigned(deleteTarget)}
                className="font-semibold text-ink"
              />
              님을 참여자 목록에서 삭제합니다. 삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-danger px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-danger-hover"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-subtle transition-colors hover:bg-edge"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
