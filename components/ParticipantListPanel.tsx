"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { Participant } from "@/lib/types";

type ParticipantListPanelProps = {
  participants: Participant[];
  selectedParticipantId: string;
  onSelectParticipant: (participantId: string) => void;
  onAddParticipant: () => void;
  onDeleteParticipant: (participantId: string) => void;
};

export function ParticipantListPanel({
  participants,
  selectedParticipantId,
  onSelectParticipant,
  onAddParticipant,
  onDeleteParticipant,
}: ParticipantListPanelProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
        <div className="flex h-full items-center justify-center rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3">
          <p className="text-[13px] font-semibold text-[#4E5968]">
            인원{" "}
            <span className="font-bold text-[#3182F6]">
              {participants.length}
            </span>
            명
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
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
          participants.map((participant) => {
            const selected = participant.id === selectedParticipantId;

            return (
              <button
                key={participant.id}
                type="button"
                onClick={() => onSelectParticipant(participant.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                  selected
                    ? "border-[#3182F6] bg-[#F2F8FF]"
                    : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-[#191F28]">
                      {participant.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#8B95A1]">
                      {participant.department}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={participant.status} />
                  </div>
                </div>
              </button>
            );
          })
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
              <span className="font-semibold text-[#191F28]">
                {selectedParticipant.name}
              </span>
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
