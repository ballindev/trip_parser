"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TripFormDialog,
  type TripFormValues,
} from "@/components/TripFormDialog";
import {
  RowDeleteButton,
  RowEditButton,
} from "@/components/RowActionIcons";
import { formatDateRange, participationBadge } from "@/lib/format";
import { listCardClassName } from "@/lib/list-card-styles";
import type { Trip } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";
import { uiPanel, uiPanelHeader } from "@/lib/ui-tokens";

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type TripListPanelProps = {
  trips: Trip[];
  selectedTripId: string;
  onSelectTrip: (tripId: string) => void;
  onAddTrip: (values: TripFormValues) => void;
  onUpdateTrip: (tripId: string, values: TripFormValues) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenAttachment: () => void;
  arrivalToken?: number;
};

type FormDialogState =
  | { mode: "create" }
  | { mode: "edit"; tripId: string; values: TripFormValues }
  | null;

export function TripListPanel({
  trips,
  selectedTripId,
  onSelectTrip,
  onAddTrip,
  onUpdateTrip,
  onDeleteTrip,
  onOpenAttachment,
  arrivalToken,
}: TripListPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedTrip =
    trips.find((trip) => trip.id === selectedTripId) ?? null;

  const filteredTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return trips;

    return trips.filter((trip) => {
      const dateLabel = formatDateRange(trip.startDate, trip.endDate).toLowerCase();
      return (
        trip.name.toLowerCase().includes(query) ||
        trip.summary.toLowerCase().includes(query) ||
        dateLabel.includes(query)
      );
    });
  }, [trips, searchQuery]);

  useEffect(() => {
    if (!arrivalToken || !selectedTripId) return;
    document.getElementById(`trip-card-${selectedTripId}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [arrivalToken, selectedTripId]);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteTrip(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  useDialogKeyboard({
    enabled: Boolean(deleteTarget) && !formDialog,
    onConfirm: handleConfirmDelete,
    onCancel: handleCancelDelete,
  });

  const handleOpenCreate = () => {
    setFormDialog({ mode: "create" });
  };

  const handleOpenEdit = (trip: Trip) => {
    setFormDialog({
      mode: "edit",
      tripId: trip.id,
      values: {
        name: trip.name,
        summary: trip.summary,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
    });
  };

  const handleConfirmForm = (values: TripFormValues) => {
    if (!formDialog) return;

    if (formDialog.mode === "create") {
      onAddTrip(values);
    } else {
      onUpdateTrip(formDialog.tripId, values);
    }

    setFormDialog(null);
  };

  return (
    <aside
      className={`relative flex h-full w-[20%] min-w-[240px] flex-col overflow-hidden ${uiPanel}`}
    >
      <header
        className={`flex h-[56px] shrink-0 items-center justify-between gap-3 ${uiPanelHeader} px-4`}
      >
        <h2 className="min-w-0 truncate text-[15px] font-bold tracking-tight text-ink">
          출장 목록{" "}
          <span className="font-medium text-ink-subtle">({trips.length})</span>
        </h2>
        <button
          type="button"
          onClick={handleOpenCreate}
          aria-label="출장 추가"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-lg font-bold leading-none text-white transition-colors hover:bg-accent-hover"
        >
          +
        </button>
      </header>

      <div className="h-[60px] shrink-0 px-4 py-3">
        <div className="relative h-full">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="출장명, 적요, 일정 검색"
            aria-label="출장 검색"
            className="h-full w-full rounded-xl border border-edge bg-surface px-3 pr-9 text-[13px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[12px] font-bold text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink-subtle"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-4">
        {trips.length === 0 ? (
          <div className="rounded-2xl border border-edge bg-surface px-4 py-8 text-center shadow-sm">
            <p className="text-[13px] font-semibold text-ink-subtle">
              등록된 출장이 없습니다
            </p>
            <p className="mt-1 text-[12px] text-ink-subtle">
              + 버튼으로 출장을 추가해 주세요
            </p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-2xl border border-edge bg-surface px-4 py-8 text-center shadow-sm">
            <p className="text-[13px] font-semibold text-ink-subtle">
              검색 결과가 없습니다
            </p>
            <p className="mt-1 text-[12px] text-ink-subtle">
              다른 키워드로 다시 검색해 주세요
            </p>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const completed = trip.participants.filter(
              (p) => p.status === "완료",
            ).length;
            const selected = trip.id === selectedTripId;

            return (
              <div
                key={trip.id}
                id={`trip-card-${trip.id}`}
                className={listCardClassName({
                  selected,
                  withTransition: true,
                })}
              >
                {selected && arrivalToken ? (
                  <span
                    key={arrivalToken}
                    aria-hidden="true"
                    className="arrival-flash pointer-events-none absolute inset-0 z-0"
                  />
                ) : null}
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-accent"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelectTrip(trip.id)}
                  onDoubleClick={() => handleOpenEdit(trip)}
                  className="relative z-10 w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 text-[16px] font-bold leading-snug text-ink">
                      {trip.name}
                    </h3>
                    <p className="shrink-0 whitespace-nowrap pt-0.5 text-right text-[12px] font-medium leading-snug text-ink-subtle transition-opacity group-hover:opacity-0">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 line-clamp-2 text-[12px] leading-5 text-ink-secondary">
                      {trip.summary}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-opacity group-hover:opacity-0 ${
                        selected
                          ? "bg-selected text-accent"
                          : "bg-surface text-ink-subtle"
                      }`}
                    >
                      {participationBadge(
                        completed,
                        trip.participants.length,
                      )}
                    </span>
                  </div>
                </button>
                <div className="pointer-events-none absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  <RowEditButton
                    label="출장 수정"
                    onClick={() => handleOpenEdit(trip)}
                  />
                  <RowDeleteButton
                    label="출장 삭제"
                    onClick={() => setDeleteTarget(trip)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-edge px-4 py-3">
        <button
          type="button"
          onClick={onOpenAttachment}
          disabled={!selectedTrip}
          className="flex w-full items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle"
        >
          붙임 자료 생성
        </button>
      </div>

      {formDialog ? (
        <TripFormDialog
          mode={formDialog.mode}
          initialValues={
            formDialog.mode === "create"
              ? {
                  name: "",
                  summary: "",
                  startDate: todayIsoDate(),
                  endDate: todayIsoDate(),
                }
              : formDialog.values
          }
          onConfirm={handleConfirmForm}
          onCancel={() => setFormDialog(null)}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-trip-title"
            className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          >
            <h3
              id="delete-trip-title"
              className="text-[17px] font-bold text-ink"
            >
              출장을 삭제할까요?
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-ink-subtle">
              <span className="font-semibold text-ink">
                {deleteTarget.name}
              </span>
              을(를) 목록에서 삭제합니다. 참여자 데이터도 함께 삭제되며 복구할
              수 없습니다.
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
