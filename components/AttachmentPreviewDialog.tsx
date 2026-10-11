"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  buildAttachmentText,
  getIncompleteParticipants,
  getLodgingCapWarnings,
  isTripReadyForAttachment,
} from "@/lib/attachment-text";
import { formatCurrency } from "@/lib/format";
import type { Participant, Person, Trip } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

type AttachmentPreviewDialogProps = {
  trip: Trip;
  people: Person[];
  onClose: () => void;
  onSelectParticipant: (participantId: string) => void;
};

export function AttachmentPreviewDialog({
  trip,
  people,
  onClose,
  onSelectParticipant,
}: AttachmentPreviewDialogProps) {
  const ready = isTripReadyForAttachment(trip);
  const incomplete = useMemo(
    () => getIncompleteParticipants(trip),
    [trip],
  );
  const text = useMemo(
    () => (ready ? buildAttachmentText(trip, people) : ""),
    [ready, trip, people],
  );
  const lodgingWarnings = useMemo(
    () => (ready ? getLodgingCapWarnings(trip) : []),
    [ready, trip],
  );

  const [copied, setCopied] = useState(false);

  useDialogKeyboard({
    enabled: true,
    onCancel: onClose,
    confirmDisabled: true,
  });

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleSelectIncomplete = (participant: Participant) => {
    onSelectParticipant(participant.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-preview-title"
        className="flex max-h-[min(720px,90vh)] w-fit min-w-[560px] max-w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E5E8EB] px-6 py-5">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#8B95A1]">
              붙임 자료
            </p>
            <h2
              id="attachment-preview-title"
              className="mt-0.5 truncate text-[17px] font-bold text-[#191F28]"
            >
              {trip.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F6] text-[16px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
          >
            ×
          </button>
        </header>

        {ready ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {lodgingWarnings.length > 0 ? (
                <div className="mb-4 rounded-xl bg-[#FFF8E8] px-4 py-3">
                  <p className="text-[13px] font-bold text-[#191F28]">
                    숙박비 한도 초과 안내
                  </p>
                  <ul className="mt-1 space-y-1 text-[12px] leading-5 text-[#8B95A1]">
                    {lodgingWarnings.map((warning, index) => (
                      <li key={`${warning.participantName}-${index}`}>
                        {warning.participantName}:{" "}
                        {formatCurrency(warning.amount)}원 (한도{" "}
                        {formatCurrency(warning.cap)}원 / {warning.region || "지역 미입력"}
                        )
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {text ? (
                <pre className="overflow-x-auto whitespace-pre rounded-xl bg-[#F9FAFB] px-4 py-4 font-mono text-[13px] leading-6 text-[#191F28]">
                  {text}
                </pre>
              ) : (
                <div className="rounded-xl bg-[#F9FAFB] px-4 py-10 text-center">
                  <p className="text-[14px] font-semibold text-[#4E5968]">
                    취합할 비용 항목이 없습니다
                  </p>
                  <p className="mt-1 text-[12px] text-[#8B95A1]">
                    일비·식비·교통비·숙박비 입력을 확인해 주세요
                  </p>
                </div>
              )}
            </div>
            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[#E5E8EB] px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#F2F4F6] px-4 py-2.5 text-[13px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!text}
                className="rounded-xl bg-[#3182F6] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1B64DA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? "복사됨" : "전체 복사"}
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="rounded-xl bg-[#FFF8E8] px-4 py-3">
                <p className="text-[14px] font-bold text-[#191F28]">
                  전원 작성 완료 후에 취합할 수 있습니다
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#8B95A1]">
                  {trip.participants.length === 0
                    ? "참여자를 추가한 뒤 복명서를 작성해 주세요."
                    : "아래 미완료 인원을 선택하면 해당 입력 화면으로 이동합니다."}
                </p>
              </div>

              {incomplete.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {incomplete.map((participant) => (
                    <li key={participant.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectIncomplete(participant)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E5E8EB] bg-white px-4 py-3 text-left transition-colors hover:border-[#3182F6] hover:bg-[#F2F8FF]"
                      >
                        <span className="truncate text-[14px] font-semibold text-[#191F28]">
                          {participant.name}
                        </span>
                        <StatusBadge status={participant.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <footer className="flex shrink-0 items-center justify-end border-t border-[#E5E8EB] px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#3182F6] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1B64DA]"
              >
                확인
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
