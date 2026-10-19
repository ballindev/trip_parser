"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import { ReportInputSummary } from "@/components/report-form/ReportInputSummary";
import { formatCurrency, formatDateRange } from "@/lib/format";
import {
  buildPersonExpenseSummary,
  type PersonExpensePeriodGroup,
  type PersonExpenseTripItem,
} from "@/lib/person-expense";
import type { Person, Trip } from "@/lib/types";

type ExpenseViewMode = "trip" | "month" | "year";

type PersonExpensePanelProps = {
  person: Person | null;
  trips: Trip[];
  people: Person[];
  onOpenTrip?: (tripId: string, participantId: string) => void;
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-150 ${
        expanded ? "rotate-90" : "rotate-0"
      }`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function TripAmountRow({
  item,
  nested = false,
  selected = false,
  onSelect,
}: {
  item: PersonExpenseTripItem;
  nested?: boolean;
  selected?: boolean;
  onSelect: (item: PersonExpenseTripItem) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(item)}
      className={`relative w-full overflow-hidden px-3 py-2 text-left ${
        nested ? "rounded-lg" : "rounded-xl py-2.5"
      } ${
        selected
          ? "bg-selected"
          : nested
            ? "bg-surface/80 ring-1 ring-edge hover:bg-surface-muted"
            : "bg-surface-subtle hover:bg-surface-muted"
      }`}
    >
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-accent"
        />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <p
          className={`min-w-0 flex-1 truncate font-bold text-ink ${
            nested ? "text-[12px]" : "text-[13px]"
          }`}
        >
          {item.tripName}
        </p>
        <p
          className={`shrink-0 font-bold text-ink ${
            nested ? "text-[12px]" : "text-[13px]"
          }`}
        >
          {formatCurrency(item.amount)}원
        </p>
      </div>
      <p
        className={`mt-0.5 text-ink-subtle ${
          nested ? "text-[11px]" : "text-[12px]"
        }`}
      >
        {formatDateRange(item.startDate, item.endDate) || "일정 없음"}
      </p>
    </button>
  );
}

function PeriodGroupList({
  groups,
  selectedParticipantId,
  onSelect,
}: {
  groups: PersonExpensePeriodGroup[];
  selectedParticipantId: string;
  onSelect: (item: PersonExpenseTripItem) => void;
}) {
  const [expandedKey, setExpandedKey] = useState("");

  if (groups.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-[13px] text-ink-subtle">
        완료된 출장비가 없습니다
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const expanded = expandedKey === group.key;
        return (
          <div key={group.key}>
            <div
              className={`relative overflow-hidden rounded-xl border transition-all ${
                expanded
                  ? "border-edge bg-surface shadow-[0_1px_2px_rgba(25,31,40,0.04),0_8px_20px_rgba(25,31,40,0.08)]"
                  : "border-transparent bg-surface-subtle hover:bg-surface-muted"
              }`}
            >
              {expanded ? (
                <span
                  aria-hidden="true"
                  className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-accent"
                />
              ) : null}
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setExpandedKey((prev) =>
                    prev === group.key ? "" : group.key,
                  )
                }
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    expanded
                      ? "bg-selected text-accent"
                      : "bg-surface-inset text-ink-subtle"
                  }`}
                >
                  <ChevronIcon expanded={expanded} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink">
                    {group.label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-subtle">
                    {group.count}건
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-bold text-ink">
                  {formatCurrency(group.total)}원
                </p>
              </button>
            </div>
            {expanded ? (
              <div className="relative ml-3 mt-1.5 space-y-1.5 border-l-2 border-edge-strong py-0.5 pl-3">
                {group.items.map((item) => (
                  <TripAmountRow
                    key={item.participantId}
                    item={item}
                    nested
                    selected={item.participantId === selectedParticipantId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ExpenseSummaryAside({
  trips,
  people,
  selectedItem,
  onOpenTrip,
}: {
  trips: Trip[];
  people: Person[];
  selectedItem: PersonExpenseTripItem | null;
  onOpenTrip?: (tripId: string, participantId: string) => void;
}) {
  const selectedTrip = useMemo(() => {
    if (!selectedItem) return null;
    return trips.find((trip) => trip.id === selectedItem.tripId) ?? null;
  }, [trips, selectedItem]);

  const selectedParticipant =
    selectedTrip?.participants.find(
      (participant) => participant.id === selectedItem?.participantId,
    ) ?? null;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-edge bg-surface">
      {!selectedItem || !selectedTrip || !selectedParticipant ? (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <p className="text-center text-[13px] leading-5 text-ink-subtle">
            출장을 선택하면
            <br />
            입력 요약이 표시됩니다
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ReportInputSummary
              participant={selectedParticipant}
              form={selectedParticipant.form}
              directoryPeople={people}
              tripParticipants={selectedTrip.participants}
            />
          </div>
          {onOpenTrip ? (
            <div className="shrink-0 border-t border-edge px-3 py-3">
              <button
                type="button"
                onClick={() =>
                  onOpenTrip(selectedItem.tripId, selectedItem.participantId)
                }
                className="flex w-full items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-accent-hover"
              >
                출장 페이지로 이동
              </button>
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}

export function PersonExpensePanel({
  person,
  trips,
  people,
  onOpenTrip,
}: PersonExpensePanelProps) {
  const [mode, setMode] = useState<ExpenseViewMode>("trip");
  const [selectedParticipantId, setSelectedParticipantId] = useState("");

  const summary = useMemo(() => {
    if (!person) return null;
    return buildPersonExpenseSummary(trips, person.id, people);
  }, [person, trips, people]);

  useEffect(() => {
    setSelectedParticipantId("");
  }, [person?.id]);

  const selectedItem =
    summary?.items.find((item) => item.participantId === selectedParticipantId) ??
    null;

  const handleSelectItem = (item: PersonExpenseTripItem) => {
    setSelectedParticipantId(item.participantId);
  };

  return (
    <section className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-edge bg-surface">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[56px] shrink-0 items-center gap-2 border-b border-edge px-4">
          <h3 className="shrink-0 text-[15px] font-bold text-ink">
            출장비 누적 현황
          </h3>
          <p className="min-w-0 truncate text-[12px] font-medium text-ink-subtle">
            제출 완료 건만 집계됩니다.
          </p>
        </header>

        {!person || !summary ? (
          <div className="flex flex-1 items-center justify-center px-4 py-12">
            <p className="text-center text-[13px] leading-5 text-ink-subtle">
              사람을 선택하면
              <br />
              누적 금액을 확인할 수 있습니다
            </p>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-edge px-4 py-3">
              <p className="flex min-w-0 items-baseline gap-1.5">
                <PersonNameLabel
                  name={person.name}
                  resigned={isResignedPerson(person)}
                  className="truncate text-[14px] font-bold text-ink"
                />
                {person.rank ? (
                  <span className="shrink-0 text-[12px] font-medium text-ink-subtle">
                    {person.rank}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-[18px] font-bold tracking-tight text-ink">
                {formatCurrency(summary.total)}원
              </p>
              <p className="mt-0.5 text-[12px] text-ink-subtle">
                완료 {summary.count}건
              </p>
            </div>

            <div className="shrink-0 px-3 pt-3">
              <div className="flex rounded-xl bg-surface-muted p-1">
                {(
                  [
                    { value: "trip", label: "건별" },
                    { value: "month", label: "월별" },
                    { value: "year", label: "년도별" },
                  ] as const
                ).map((option) => {
                  const selected = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold transition-colors ${
                        selected
                          ? "bg-surface text-accent shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                          : "text-ink-subtle hover:text-ink-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {mode === "trip" ? (
                summary.items.length === 0 ? (
                  <p className="px-2 py-8 text-center text-[13px] text-ink-subtle">
                    완료된 출장비가 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.items.map((item) => (
                      <TripAmountRow
                        key={item.participantId}
                        item={item}
                        selected={item.participantId === selectedParticipantId}
                        onSelect={handleSelectItem}
                      />
                    ))}
                  </div>
                )
              ) : null}

              {mode === "month" ? (
                <PeriodGroupList
                  key={`${person.id}-month`}
                  groups={summary.byMonth}
                  selectedParticipantId={selectedParticipantId}
                  onSelect={handleSelectItem}
                />
              ) : null}

              {mode === "year" ? (
                <PeriodGroupList
                  key={`${person.id}-year`}
                  groups={summary.byYear}
                  selectedParticipantId={selectedParticipantId}
                  onSelect={handleSelectItem}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
      <ExpenseSummaryAside
        trips={trips}
        people={people}
        selectedItem={selectedItem}
        onOpenTrip={onOpenTrip}
      />
    </section>
  );
}
