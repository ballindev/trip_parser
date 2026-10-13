"use client";

import { useMemo, useState } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
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
}: {
  item: PersonExpenseTripItem;
  nested?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        nested
          ? "bg-white/80 ring-1 ring-[#E5E8EB]"
          : "rounded-xl bg-[#F9FAFB] py-2.5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`min-w-0 flex-1 truncate font-bold text-[#191F28] ${
            nested ? "text-[12px]" : "text-[13px]"
          }`}
        >
          {item.tripName}
        </p>
        <p
          className={`shrink-0 font-bold text-[#191F28] ${
            nested ? "text-[12px]" : "text-[13px]"
          }`}
        >
          {formatCurrency(item.amount)}원
        </p>
      </div>
      <p
        className={`mt-0.5 text-[#8B95A1] ${
          nested ? "text-[11px]" : "text-[12px]"
        }`}
      >
        {formatDateRange(item.startDate, item.endDate) || "일정 없음"}
      </p>
    </div>
  );
}

function PeriodGroupList({ groups }: { groups: PersonExpensePeriodGroup[] }) {
  const [expandedKey, setExpandedKey] = useState("");

  if (groups.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-[13px] text-[#8B95A1]">
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
                  ? "border-[#E5E8EB] bg-white shadow-[0_1px_2px_rgba(25,31,40,0.04),0_8px_20px_rgba(25,31,40,0.08)]"
                  : "border-transparent bg-[#F9FAFB] hover:bg-[#F2F4F6]"
              }`}
            >
              {expanded ? (
                <span
                  aria-hidden="true"
                  className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-[#3182F6]"
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
                      ? "bg-[#F2F8FF] text-[#3182F6]"
                      : "bg-[#EEF0F2] text-[#8B95A1]"
                  }`}
                >
                  <ChevronIcon expanded={expanded} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#191F28]">
                    {group.label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                    {group.count}건
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-bold text-[#191F28]">
                  {formatCurrency(group.total)}원
                </p>
              </button>
            </div>
            {expanded ? (
              <div className="relative ml-3 mt-1.5 space-y-1.5 border-l-2 border-[#D1D6DB] py-0.5 pl-3">
                {group.items.map((item) => (
                  <TripAmountRow
                    key={item.participantId}
                    item={item}
                    nested
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

export function PersonExpensePanel({
  person,
  trips,
  people,
}: PersonExpensePanelProps) {
  const [mode, setMode] = useState<ExpenseViewMode>("trip");

  const summary = useMemo(() => {
    if (!person) return null;
    return buildPersonExpenseSummary(trips, person.id, people);
  }, [person, trips, people]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white">
      <header className="flex h-[56px] shrink-0 items-center gap-2 border-b border-[#E5E8EB] px-4">
        <h3 className="text-[15px] font-bold text-[#191F28]">출장비 누적 현황</h3>
        <p className="text-[12px] font-medium text-[#8B95A1]">
          제출 완료 건만 집계됩니다.
        </p>
      </header>

      {!person || !summary ? (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <p className="text-center text-[13px] leading-5 text-[#8B95A1]">
            사람을 선택하면
            <br />
            누적 금액을 확인할 수 있습니다
          </p>
        </div>
      ) : (
        <>
          <div className="shrink-0 border-b border-[#E5E8EB] px-4 py-3">
            <p className="flex min-w-0 items-baseline gap-1.5">
              <PersonNameLabel
                name={person.name}
                resigned={isResignedPerson(person)}
                className="truncate text-[14px] font-bold text-[#191F28]"
              />
              {person.rank ? (
                <span className="shrink-0 text-[12px] font-medium text-[#8B95A1]">
                  {person.rank}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[18px] font-bold tracking-tight text-[#191F28]">
              {formatCurrency(summary.total)}원
            </p>
            <p className="mt-0.5 text-[12px] text-[#8B95A1]">
              완료 {summary.count}건
            </p>
          </div>

          <div className="shrink-0 px-3 pt-3">
            <div className="flex rounded-xl bg-[#F2F4F6] p-1">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {mode === "trip" ? (
              summary.items.length === 0 ? (
                <p className="px-2 py-8 text-center text-[13px] text-[#8B95A1]">
                  완료된 출장비가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.items.map((item) => (
                    <TripAmountRow key={item.participantId} item={item} />
                  ))}
                </div>
              )
            ) : null}

            {mode === "month" ? (
              <PeriodGroupList key={`${person.id}-month`} groups={summary.byMonth} />
            ) : null}

            {mode === "year" ? (
              <PeriodGroupList key={`${person.id}-year`} groups={summary.byYear} />
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
