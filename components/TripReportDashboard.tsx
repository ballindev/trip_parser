"use client";

import { useMemo, useState } from "react";
import { DirectoryManageView } from "@/components/DirectoryManageView";
import { ParticipantListPanel } from "@/components/ParticipantListPanel";
import { ParticipantPickerDialog } from "@/components/ParticipantPickerDialog";
import { ReportFormPanel } from "@/components/ReportFormPanel";
import type { TripFormValues } from "@/components/TripFormDialog";
import { TripListPanel } from "@/components/TripListPanel";
import { buildDailyHours } from "@/lib/daily-hours";
import { buildDailyMeals } from "@/lib/daily-meals";
import {
  DUMMY_PEOPLE,
  DUMMY_TEAMS,
  DUMMY_TRIPS,
} from "@/lib/dummy-data";
import type { Person, ReportForm, Team, Trip } from "@/lib/types";

type AppTab = "trips" | "directory";

export function TripReportDashboard() {
  const [appTab, setAppTab] = useState<AppTab>("trips");
  const [trips, setTrips] = useState<Trip[]>(DUMMY_TRIPS);
  const [people, setPeople] = useState<Person[]>(DUMMY_PEOPLE);
  const [teams, setTeams] = useState<Team[]>(DUMMY_TEAMS);
  const [selectedTripId, setSelectedTripId] = useState(DUMMY_TRIPS[0].id);
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    DUMMY_TRIPS[0].participants[0].id,
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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

  const handleSelectTrip = (tripId: string) => {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;

    setSelectedTripId(tripId);
    setSelectedParticipantId(trip.participants[0]?.id ?? "");
  };

  const handleSelectParticipant = (participantId: string) => {
    setSelectedParticipantId(participantId);
  };

  const handleAddTrip = (values: TripFormValues) => {
    const newId = `trip-new-${Date.now()}`;

    const newTrip: Trip = {
      id: newId,
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      summary: values.summary,
      participants: [],
    };

    setTrips((prev) => [...prev, newTrip]);
    setSelectedTripId(newId);
    setSelectedParticipantId("");
  };

  const handleUpdateTrip = (tripId: string, values: TripFormValues) => {
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
  };

  const handleDeleteTrip = (tripId: string) => {
    const remaining = trips.filter((trip) => trip.id !== tripId);

    setTrips(remaining);

    if (selectedTripId === tripId) {
      const nextTrip = remaining[0] ?? null;
      setSelectedTripId(nextTrip?.id ?? "");
      setSelectedParticipantId(nextTrip?.participants[0]?.id ?? "");
    }
  };

  const handleOpenParticipantPicker = () => {
    if (!selectedTrip) return;
    setIsPickerOpen(true);
  };

  const handleConfirmParticipants = (selectedPeople: Person[]) => {
    if (!selectedTrip || selectedPeople.length === 0) return;

    const dailyHours = buildDailyHours(
      selectedTrip.startDate,
      selectedTrip.endDate,
    );
    const dailyMeals = buildDailyMeals(
      selectedTrip.startDate,
      selectedTrip.endDate,
    );
    const stamp = Date.now();

    const newParticipants = selectedPeople.map((person, index) => ({
      id: `${selectedTrip.id}-new-${stamp}-${index}`,
      personId: person.id,
      name: person.name,
      department: person.department,
      status: "미작성" as const,
      form: {
        region: "",
        startDate: selectedTrip.startDate,
        endDate: selectedTrip.endDate,
        dailyHours,
        dailyMeals,
        transportCost: 0,
        lodgingCost: 0,
      },
    }));

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== selectedTrip.id) return trip;
        return {
          ...trip,
          participants: [...trip.participants, ...newParticipants],
        };
      }),
    );

    setSelectedParticipantId(newParticipants[0]?.id ?? "");
    setIsPickerOpen(false);
  };

  const handleDeleteParticipant = (participantId: string) => {
    if (!selectedTrip) return;

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

  return (
    <div className="flex h-screen min-w-[1280px] flex-col bg-[#F2F4F6]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E8EB] bg-white px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3182F6] text-[13px] font-bold text-white">
              TR
            </div>
            <div>
              <h1 className="text-[16px] font-bold tracking-tight text-[#191F28]">
                출장비 데이터 취합 대시보드
              </h1>
              <p className="text-[12px] text-[#8B95A1]">PC 브라우저 전용</p>
            </div>
          </div>

          <div className="flex rounded-xl bg-[#F2F4F6] p-1">
            {(
              [
                { value: "trips", label: "출장 취합" },
                { value: "directory", label: "인원/팀 관리" },
              ] as const
            ).map((option) => {
              const selected = appTab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAppTab(option.value)}
                  className={`rounded-lg px-4 py-1.5 text-[13px] font-bold transition-colors ${
                    selected
                      ? "bg-white text-[#3182F6] shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                      : "text-[#8B95A1] hover:text-[#4E5968]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[13px] font-medium text-[#8B95A1]">
          {appTab === "directory"
            ? `등록: 사람 ${people.length}명 · 팀 ${teams.length}개`
            : selectedTrip
              ? `선택: ${selectedTrip.name}${
                  selectedParticipant ? ` · ${selectedParticipant.name}` : ""
                }`
              : "선택된 출장이 없습니다"}
        </p>
      </header>

      {appTab === "directory" ? (
        <DirectoryManageView
          people={people}
          teams={teams}
          onAddPerson={(person, teamId) => {
            const newId = `person-${Date.now()}`;
            setPeople((prev) => [...prev, { ...person, id: newId }]);
            setTeams((prev) =>
              prev.map((team) => {
                if (team.id !== teamId) return team;
                if (team.memberIds.includes(newId)) return team;
                return { ...team, memberIds: [...team.memberIds, newId] };
              }),
            );
          }}
          onUpdatePerson={(personId, next, teamId) => {
            setPeople((prev) =>
              prev.map((person) =>
                person.id === personId ? { ...person, ...next } : person,
              ),
            );
            setTeams((prev) =>
              prev.map((team) => {
                const withoutPerson = team.memberIds.filter(
                  (id) => id !== personId,
                );
                if (team.id === teamId) {
                  return {
                    ...team,
                    memberIds: withoutPerson.includes(personId)
                      ? withoutPerson
                      : [...withoutPerson, personId],
                  };
                }
                return { ...team, memberIds: withoutPerson };
              }),
            );
          }}
          onDeletePerson={(personId) => {
            setPeople((prev) => prev.filter((person) => person.id !== personId));
            setTeams((prev) =>
              prev.map((team) => ({
                ...team,
                memberIds: team.memberIds.filter((id) => id !== personId),
              })),
            );
          }}
          onAddTeam={(team) =>
            setTeams((prev) => [
              ...prev,
              { ...team, id: `team-${Date.now()}` },
            ])
          }
          onUpdateTeam={(teamId, next) =>
            setTeams((prev) =>
              prev.map((team) =>
                team.id === teamId ? { ...team, ...next } : team,
              ),
            )
          }
          onDeleteTeam={(teamId) =>
            setTeams((prev) => prev.filter((team) => team.id !== teamId))
          }
        />
      ) : (
        <main className="flex min-h-0 flex-1">
          <TripListPanel
            trips={trips}
            selectedTripId={selectedTripId}
            onSelectTrip={handleSelectTrip}
            onAddTrip={handleAddTrip}
            onUpdateTrip={handleUpdateTrip}
            onDeleteTrip={handleDeleteTrip}
          />
          {selectedTrip ? (
            <ParticipantListPanel
              participants={selectedTrip.participants}
              selectedParticipantId={selectedParticipantId}
              onSelectParticipant={handleSelectParticipant}
              onAddParticipant={handleOpenParticipantPicker}
              onDeleteParticipant={handleDeleteParticipant}
            />
          ) : (
            <aside className="flex h-full w-[10%] min-w-[140px] flex-col border-r border-[#E5E8EB] bg-white">
              <header className="flex h-[56px] shrink-0 items-center border-b border-[#E5E8EB] px-3">
                <h2 className="truncate text-[15px] font-bold tracking-tight text-[#191F28]">
                  참여자
                </h2>
              </header>
              <div className="h-[60px] shrink-0 px-3 py-3">
                <div className="flex h-full items-center justify-center rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3">
                  <p className="text-[13px] font-semibold text-[#8B95A1]">
                    인원 0명
                  </p>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center px-3 text-center">
                <p className="text-[12px] leading-5 text-[#8B95A1]">
                  출장을 선택해 주세요
                </p>
              </div>
            </aside>
          )}
          <ReportFormPanel
            participant={selectedParticipant}
            form={selectedParticipant?.form ?? null}
            tripStartDate={selectedTrip?.startDate ?? ""}
            tripEndDate={selectedTrip?.endDate ?? ""}
            onChange={handleFormChange}
          />
        </main>
      )}

      {isPickerOpen ? (
        <ParticipantPickerDialog
          people={people}
          teams={teams}
          existingPersonIds={existingPersonIds}
          onConfirm={handleConfirmParticipants}
          onCancel={() => setIsPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
