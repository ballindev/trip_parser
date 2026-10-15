"use client";

import { useEffect, useMemo, useState } from "react";
import { AttachmentPreviewDialog } from "@/components/AttachmentPreviewDialog";
import { DirectoryManageView } from "@/components/DirectoryManageView";
import { ParticipantListPanel } from "@/components/ParticipantListPanel";
import { ParticipantPickerDialog } from "@/components/ParticipantPickerDialog";
import { ReportFormPanel } from "@/components/ReportFormPanel";
import type { TripFormValues } from "@/components/TripFormDialog";
import { TripListPanel } from "@/components/TripListPanel";
import { api } from "@/lib/api/client";
import { isReportReadyToSubmit } from "@/lib/report-validation";
import type { Person, ReportForm, Team, Trip, WriteStatus } from "@/lib/types";
import { useTripDirectoryActions } from "@/lib/use-trip-directory-actions";
import { uiCanvas, uiPanel, uiPanelHeader } from "@/lib/ui-tokens";

export function TripReportDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [nextPeople, nextTeams, nextTrips] = await Promise.all([
          api.getPeople(),
          api.getTeams(),
          api.getTrips(),
        ]);
        if (cancelled) return;

        setPeople(nextPeople);
        setTeams(nextTeams);
        setTrips(nextTrips);

        const firstTrip = nextTrips[0];
        setSelectedTripId(firstTrip?.id ?? "");
        setSelectedParticipantId(firstTrip?.participants[0]?.id ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "데이터를 불러오지 못했습니다. Supabase 스키마/시드 실행 여부를 확인해 주세요.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  const selectedParticipant = useMemo(
    () =>
      selectedTrip?.participants.find(
        (participant) => participant.id === selectedParticipantId,
      ) ?? null,
    [selectedTrip, selectedParticipantId],
  );

  const existingPersonIds = useMemo(
    () =>
      (selectedTrip?.participants ?? [])
        .map((participant) => participant.personId)
        .filter((id): id is string => Boolean(id)),
    [selectedTrip],
  );

  const directoryActions = useTripDirectoryActions({
    people,
    teams,
    setPeople,
    setTeams,
    setTrips,
    setError,
  });

  const handleSelectTrip = (tripId: string) => {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;

    setSelectedTripId(tripId);
    setSelectedParticipantId(trip.participants[0]?.id ?? "");
  };

  const handleSelectParticipant = (participantId: string) => {
    setSelectedParticipantId(participantId);
  };

  const handleAddTrip = async (values: TripFormValues) => {
    setSaving(true);
    setError("");
    try {
      const created = await api.createTrip({
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        summary: values.summary,
      });
      setTrips((prev) => [...prev, created]);
      setSelectedTripId(created.id);
      setSelectedParticipantId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "출장 추가 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTrip = async (tripId: string, values: TripFormValues) => {
    setSaving(true);
    setError("");
    try {
      await api.updateTrip(tripId, {
        name: values.name,
        summary: values.summary,
        startDate: values.startDate,
        endDate: values.endDate,
      });
      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                name: values.name,
                summary: values.summary,
                startDate: values.startDate,
                endDate: values.endDate,
              }
            : trip,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "출장 수정 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    setSaving(true);
    setError("");
    try {
      await api.deleteTrip(tripId);
      const remaining = trips.filter((trip) => trip.id !== tripId);
      setTrips(remaining);

      if (selectedTripId === tripId) {
        const nextTrip = remaining[0] ?? null;
        setSelectedTripId(nextTrip?.id ?? "");
        setSelectedParticipantId(nextTrip?.participants[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "출장 삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenParticipantPicker = () => {
    if (!selectedTrip) return;
    setIsPickerOpen(true);
  };

  const handleConfirmParticipants = async (selectedPeople: Person[]) => {
    if (!selectedTrip || selectedPeople.length === 0) return;

    setSaving(true);
    setError("");
    try {
      const created = await api.addParticipants(
        selectedTrip.id,
        selectedPeople,
      );
      setTrips((prev) =>
        prev.map((trip) => {
          if (trip.id !== selectedTrip.id) return trip;
          return {
            ...trip,
            participants: [...trip.participants, ...created],
          };
        }),
      );
      setSelectedParticipantId(created[0]?.id ?? "");
      setIsPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "참가자 추가 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!selectedTrip) return;

    setSaving(true);
    setError("");
    try {
      await api.deleteParticipant(selectedTrip.id, participantId);
      const remaining = selectedTrip.participants.filter(
        (participant) => participant.id !== participantId,
      );

      setTrips((prev) =>
        prev.map((trip) => {
          if (trip.id !== selectedTrip.id) return trip;
          return { ...trip, participants: remaining };
        }),
      );

      if (selectedParticipantId === participantId) {
        setSelectedParticipantId(remaining[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "참가자 삭제 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleReorderParticipants = async (orderedIds: string[]) => {
    if (!selectedTrip) return;

    const current = selectedTrip.participants;
    if (
      orderedIds.length !== current.length ||
      orderedIds.every((id, index) => current[index]?.id === id)
    ) {
      return;
    }

    const byId = new Map(
      current.map((participant) => [participant.id, participant]),
    );
    const reordered = orderedIds
      .map((id) => byId.get(id))
      .filter((participant): participant is (typeof current)[number] =>
        Boolean(participant),
      );
    if (reordered.length !== current.length) return;

    const previous = current;
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== selectedTrip.id) return trip;
        return { ...trip, participants: reordered };
      }),
    );

    setError("");
    try {
      await api.reorderParticipants(selectedTrip.id, orderedIds);
    } catch (err) {
      setTrips((prev) =>
        prev.map((trip) => {
          if (trip.id !== selectedTrip.id) return trip;
          return { ...trip, participants: previous };
        }),
      );
      setError(err instanceof Error ? err.message : "참여자 순서 변경 실패");
    }
  };

  const handleFormChange = (nextForm: ReportForm) => {
    if (!selectedTrip || !selectedParticipant) return;

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== selectedTrip.id) return trip;
        return {
          ...trip,
          participants: trip.participants.map((participant) =>
            participant.id === selectedParticipant.id
              ? { ...participant, form: nextForm }
              : participant,
          ),
        };
      }),
    );
  };

  const persistReport = async (status: WriteStatus) => {
    if (!selectedTrip || !selectedParticipant) return;

    setSaving(true);
    setError("");
    try {
      await api.saveReport(selectedParticipant.id, selectedParticipant.form, status);
      setTrips((prev) =>
        prev.map((trip) => {
          if (trip.id !== selectedTrip.id) return trip;
          return {
            ...trip,
            participants: trip.participants.map((participant) =>
              participant.id === selectedParticipant.id
                ? { ...participant, status }
                : participant,
            ),
          };
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : status === "완료"
            ? "제출 실패"
            : "임시 저장 실패",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDraftSave = () => {
    void persistReport("작성중");
  };

  const handleSubmit = () => {
    if (!selectedParticipant) return;
    if (!isReportReadyToSubmit(selectedParticipant.form)) return;
    void persistReport("완료");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-subtle">
        <p className="text-[14px] font-semibold text-ink-subtle">
          데이터를 불러오는 중…
        </p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen min-w-[1280px] flex-col ${uiCanvas}`}>
      <header
        className={`flex h-14 shrink-0 items-center justify-between ${uiPanelHeader} bg-surface px-6`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo-sspe.png"
            alt="학교체육진흥회"
            className="h-9 w-auto shrink-0"
          />
          <span
            aria-hidden="true"
            className="h-4 w-px shrink-0 bg-edge"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-bold tracking-tight text-ink">
              출장 관리 & 붙임 자료 생성
            </h1>
            {saving ? (
              <p className="text-[12px] text-ink-subtle">저장 중…</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDirectoryOpen(true)}
          className="shrink-0 rounded-xl bg-surface-muted px-3.5 py-2 text-[13px] font-bold text-ink-subtle transition-colors hover:bg-edge hover:text-ink"
        >
          팀/인원 관리
        </button>
      </header>

      {error ? (
        <div className="border-b border-danger-edge bg-danger-soft px-6 py-2 text-[13px] font-medium text-danger">
          {error}
        </div>
      ) : null}

      <main className="flex min-h-0 flex-1 gap-3 p-3">
        <TripListPanel
          trips={trips}
          selectedTripId={selectedTripId}
          onSelectTrip={handleSelectTrip}
          onAddTrip={handleAddTrip}
          onUpdateTrip={handleUpdateTrip}
          onDeleteTrip={handleDeleteTrip}
          onOpenAttachment={() => setIsAttachmentOpen(true)}
        />
        {selectedTrip ? (
          <ParticipantListPanel
            participants={selectedTrip.participants}
            people={people}
            selectedParticipantId={selectedParticipantId}
            onSelectParticipant={handleSelectParticipant}
            onAddParticipant={handleOpenParticipantPicker}
            onDeleteParticipant={handleDeleteParticipant}
            onReorderParticipants={handleReorderParticipants}
          />
        ) : (
          <aside
            className={`flex h-full w-[10%] min-w-[140px] flex-col overflow-hidden ${uiPanel}`}
          >
            <header className={`flex h-[56px] shrink-0 items-center ${uiPanelHeader} px-3`}>
              <h2 className="truncate text-[15px] font-bold tracking-tight text-ink">
                참여자
              </h2>
            </header>
            <div className="h-[60px] shrink-0 px-3 py-3">
              <div className="flex h-full items-center justify-center rounded-xl border border-edge bg-surface px-3 shadow-sm">
                <p className="text-[13px] font-semibold text-ink-subtle">
                  인원 0명
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center px-3 text-center">
              <p className="text-[12px] leading-5 text-ink-subtle">
                출장을 선택해 주세요
              </p>
            </div>
          </aside>
        )}
        <ReportFormPanel
          participant={selectedParticipant}
          form={selectedParticipant?.form ?? null}
          directoryPeople={people}
          tripParticipants={selectedTrip?.participants ?? []}
          tripName={selectedTrip?.name ?? ""}
          tripStartDate={selectedTrip?.startDate ?? ""}
          tripEndDate={selectedTrip?.endDate ?? ""}
          saving={saving}
          onChange={handleFormChange}
          onDraftSave={handleDraftSave}
          onSubmit={handleSubmit}
        />
      </main>

      {directoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="directory-modal-title"
            className="flex h-[min(760px,92vh)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-surface-subtle shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          >
            <header
              className={`flex h-14 shrink-0 items-center justify-between gap-3 ${uiPanelHeader} bg-surface px-5`}
            >
              <div className="flex min-w-0 items-baseline gap-2.5">
                <h2
                  id="directory-modal-title"
                  className="shrink-0 text-[16px] font-bold text-ink"
                >
                  팀/인원 관리
                </h2>
                <p className="truncate text-[12px] text-ink-subtle">
                  팀과 팀원을 관리하고 출장비 누적 현황을 확인할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryOpen(false)}
                className="shrink-0 rounded-xl bg-surface-muted px-3 py-1.5 text-[13px] font-bold text-ink-subtle transition-colors hover:bg-edge"
              >
                닫기
              </button>
            </header>
            <DirectoryManageView
              embedded
              people={people}
              teams={teams}
              trips={trips}
              onRequestClose={() => setDirectoryOpen(false)}
              {...directoryActions}
            />
          </div>
        </div>
      ) : null}

      {isPickerOpen ? (
        <ParticipantPickerDialog
          people={people}
          teams={teams}
          existingPersonIds={existingPersonIds}
          onConfirm={handleConfirmParticipants}
          onCancel={() => setIsPickerOpen(false)}
        />
      ) : null}

      {isAttachmentOpen && selectedTrip ? (
        <AttachmentPreviewDialog
          trip={selectedTrip}
          people={people}
          onClose={() => setIsAttachmentOpen(false)}
          onSelectParticipant={handleSelectParticipant}
        />
      ) : null}
    </div>
  );
}
