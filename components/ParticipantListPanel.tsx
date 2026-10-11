"use client";

import { useMemo, useState, type DragEvent } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import { StatusBadge } from "@/components/StatusBadge";
import type { Participant, Person } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

type DropIndicator =
  | { kind: "edge"; edge: "start" | "end" }
  | { kind: "item"; targetId: string; placement: "before" | "after" };

type ParticipantListPanelProps = {
  participants: Participant[];
  people?: Person[];
  selectedParticipantId: string;
  onSelectParticipant: (participantId: string) => void;
  onAddParticipant: () => void;
  onDeleteParticipant: (participantId: string) => void;
  onReorderParticipants: (orderedIds: string[]) => void;
};

function InsertionLine({ label }: { label?: string }) {
  return (
    <div className="pointer-events-none flex items-center gap-2 py-1">
      <div className="h-0.5 flex-1 rounded-full bg-[#3182F6]" />
      {label ? (
        <span className="shrink-0 text-[10px] font-bold text-[#3182F6]">
          {label}
        </span>
      ) : null}
      <div className="h-0.5 flex-1 rounded-full bg-[#3182F6]" />
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
}: ParticipantListPanelProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(
    null,
  );

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  const isParticipantResigned = (participant: Participant) => {
    if (!participant.personId) return false;
    return isResignedPerson(peopleById.get(participant.personId));
  };

  const selectedParticipant =
    participants.find((participant) => participant.id === selectedParticipantId) ??
    null;

  const handleClickDelete = () => {
    if (!selectedParticipant) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedParticipant) return;
    onDeleteParticipant(selectedParticipant.id);
    setIsDeleteConfirmOpen(false);
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
  };

  useDialogKeyboard({
    enabled: isDeleteConfirmOpen && Boolean(selectedParticipant),
    onConfirm: handleConfirmDelete,
    onCancel: handleCancelDelete,
  });

  const clearDragState = () => {
    setDraggingId(null);
    setDropIndicator(null);
  };

  const applyReorder = (sourceId: string, nextIds: string[]) => {
    if (nextIds.every((id, index) => participants[index]?.id === id)) return;
    onReorderParticipants(nextIds);
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    participantId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", participantId);
    setDraggingId(participantId);
  };

  const resolvePlacement = (
    event: DragEvent<HTMLDivElement>,
  ): "before" | "after" => {
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    return event.clientY < midpoint ? "before" : "after";
  };

  const firstId = participants[0]?.id ?? null;
  const lastId = participants[participants.length - 1]?.id ?? null;

  const handleItemDragOver = (
    event: DragEvent<HTMLDivElement>,
    participantId: string,
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingId === participantId) {
      setDropIndicator(null);
      return;
    }

    const placement = resolvePlacement(event);

    // 첫/마지막 카드의 바깥쪽은 맨 위·맨 아래 드롭과 동일하므로 edge로 통합합니다.
    if (participantId === firstId && placement === "before") {
      setDropIndicator({ kind: "edge", edge: "start" });
      return;
    }
    if (participantId === lastId && placement === "after") {
      setDropIndicator({ kind: "edge", edge: "end" });
      return;
    }

    setDropIndicator((prev) => {
      if (
        prev?.kind === "item" &&
        prev.targetId === participantId &&
        prev.placement === placement
      ) {
        return prev;
      }
      return { kind: "item", targetId: participantId, placement };
    });
  };

  const handleItemDrop = (
    event: DragEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    const sourceId =
      event.dataTransfer.getData("text/plain") || draggingId || "";
    const indicator = dropIndicator;
    clearDragState();
    if (!sourceId) return;

    if (indicator?.kind === "edge") {
      const withoutSource = participants
        .map((item) => item.id)
        .filter((id) => id !== sourceId);
      if (indicator.edge === "start") withoutSource.unshift(sourceId);
      else withoutSource.push(sourceId);
      applyReorder(sourceId, withoutSource);
      onSelectParticipant(sourceId);
      return;
    }

    if (sourceId === targetId) {
      onSelectParticipant(sourceId);
      return;
    }

    const placement =
      indicator?.kind === "item" && indicator.targetId === targetId
        ? indicator.placement
        : resolvePlacement(event);

    const withoutSource = participants
      .map((item) => item.id)
      .filter((id) => id !== sourceId);
    let insertAt = withoutSource.indexOf(targetId);
    if (insertAt < 0) return;
    if (placement === "after") insertAt += 1;
    withoutSource.splice(insertAt, 0, sourceId);
    applyReorder(sourceId, withoutSource);
    onSelectParticipant(sourceId);
  };

  const handleEdgeDragOver = (
    event: DragEvent<HTMLDivElement>,
    edge: "start" | "end",
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndicator((prev) => {
      if (prev?.kind === "edge" && prev.edge === edge) return prev;
      return { kind: "edge", edge };
    });
  };

  const handleEdgeDrop = (
    event: DragEvent<HTMLDivElement>,
    edge: "start" | "end",
  ) => {
    event.preventDefault();
    const sourceId =
      event.dataTransfer.getData("text/plain") || draggingId || "";
    clearDragState();
    if (!sourceId) return;

    const withoutSource = participants
      .map((item) => item.id)
      .filter((id) => id !== sourceId);
    if (edge === "start") withoutSource.unshift(sourceId);
    else withoutSource.push(sourceId);
    applyReorder(sourceId, withoutSource);
    onSelectParticipant(sourceId);
  };

  const isDragging = Boolean(draggingId);
  const showStartEdge = dropIndicator?.kind === "edge" && dropIndicator.edge === "start";
  const showEndEdge = dropIndicator?.kind === "edge" && dropIndicator.edge === "end";

  return (
    <aside className="relative flex h-full w-[10%] min-w-[140px] flex-col border-r border-[#E5E8EB] bg-white">
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-[#E5E8EB] px-3">
        <h2 className="truncate text-[15px] font-bold tracking-tight text-[#191F28]">
          참여자
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onAddParticipant}
            aria-label="인원 추가"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3182F6] text-lg font-bold leading-none text-white transition-colors hover:bg-[#1B64DA]"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleClickDelete}
            disabled={!selectedParticipant}
            aria-label="인원 삭제"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2F4F6] text-lg font-bold leading-none text-[#4E5968] transition-colors hover:bg-[#FFE5E7] hover:text-[#F04452] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#F2F4F6] disabled:hover:text-[#4E5968]"
          >
            −
          </button>
        </div>
      </header>

      <div className="h-[60px] shrink-0 px-3 py-3">
        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3">
          <p className="text-[13px] font-semibold text-[#4E5968]">
            인원{" "}
            <span className="font-bold text-[#3182F6]">
              {participants.length}
            </span>
            명
          </p>
          {participants.length > 1 ? (
            <p className="mt-0.5 text-[10px] font-medium text-[#8B95A1]">
              드래그로 순서 변경
            </p>
          ) : null}
        </div>
      </div>

      {participants.length > 1 ? (
        <div
          onDragOver={(event) => handleEdgeDragOver(event, "start")}
          onDrop={(event) => handleEdgeDrop(event, "start")}
          className={`mx-3 mb-1 shrink-0 rounded-xl px-1 transition-colors ${
            isDragging
              ? showStartEdge
                ? "bg-[#F2F8FF]"
                : "bg-transparent"
              : "pointer-events-none h-0 overflow-hidden p-0"
          } ${isDragging ? "min-h-8 py-1" : ""}`}
        >
          {isDragging ? (
            showStartEdge ? (
              <InsertionLine label="맨 위" />
            ) : (
              <div className="h-0.5 rounded-full bg-[#E5E8EB]" />
            )
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
        {participants.length === 0 ? (
          <div className="rounded-2xl bg-[#F9FAFB] px-3 py-6 text-center">
            <p className="text-[12px] font-semibold text-[#4E5968]">
              참여자가 없습니다
            </p>
            <p className="mt-1 text-[11px] text-[#8B95A1]">
              + 버튼으로 추가해 주세요
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {participants.map((participant) => {
                const selected = participant.id === selectedParticipantId;
                const itemDragging = draggingId === participant.id;
                const showBefore =
                  dropIndicator?.kind === "item" &&
                  dropIndicator.targetId === participant.id &&
                  dropIndicator.placement === "before";
                const showAfter =
                  dropIndicator?.kind === "item" &&
                  dropIndicator.targetId === participant.id &&
                  dropIndicator.placement === "after";

                return (
                  <div key={participant.id} className="relative">
                    {showBefore ? (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-1.5 right-0 left-0 z-10 h-0.5 rounded-full bg-[#3182F6]"
                      />
                    ) : null}
                    <div
                      draggable
                      onDragStart={(event) =>
                        handleDragStart(event, participant.id)
                      }
                      onDragOver={(event) =>
                        handleItemDragOver(event, participant.id)
                      }
                      onDrop={(event) => handleItemDrop(event, participant.id)}
                      onDragEnd={clearDragState}
                      className={`cursor-grab rounded-2xl border transition-all active:cursor-grabbing ${
                        itemDragging
                          ? "border-dashed border-[#B0B8C1] bg-[#F9FAFB] opacity-50"
                          : selected
                            ? "border-[#3182F6] bg-[#F2F8FF]"
                            : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectParticipant(participant.id)}
                        className="w-full cursor-inherit px-3 py-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <PersonNameLabel
                              name={participant.name}
                              resigned={isParticipantResigned(participant)}
                              className="block truncate text-[14px] font-bold text-[#191F28]"
                            />
                            <p className="mt-0.5 truncate text-[11px] text-[#8B95A1]">
                              {participant.department}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge status={participant.status} />
                          </div>
                        </div>
                      </button>
                    </div>
                    {showAfter ? (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-1.5 right-0 left-0 z-10 h-0.5 rounded-full bg-[#3182F6]"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {participants.length > 1 ? (
              <div
                onDragOver={(event) => handleEdgeDragOver(event, "end")}
                onDrop={(event) => handleEdgeDrop(event, "end")}
                className={`mt-2 min-h-16 flex-1 rounded-xl px-1 transition-colors ${
                  isDragging
                    ? showEndEdge
                      ? "bg-[#F2F8FF]"
                      : "bg-transparent"
                    : "pointer-events-none"
                }`}
              >
                {isDragging ? (
                  showEndEdge ? (
                    <div className="sticky top-0 pt-1">
                      <InsertionLine label="맨 아래" />
                    </div>
                  ) : (
                    <div className="pt-2">
                      <div className="h-0.5 rounded-full bg-[#E5E8EB]" />
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {isDeleteConfirmOpen && selectedParticipant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-participant-title"
            className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          >
            <h3
              id="delete-participant-title"
              className="text-[17px] font-bold text-[#191F28]"
            >
              인원을 삭제할까요?
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-[#4E5968]">
              <PersonNameLabel
                name={selectedParticipant.name}
                resigned={isParticipantResigned(selectedParticipant)}
                className="font-semibold text-[#191F28]"
              />
              님을 참여자 목록에서 삭제합니다. 삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-[#F04452] px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#D93A47]"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
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
