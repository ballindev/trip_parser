"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DatePicker } from "@/components/DatePicker";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import { SelectDropdown } from "@/components/SelectDropdown";
import { StatusBadge } from "@/components/StatusBadge";
import { TimePicker } from "@/components/TimePicker";
import {
  formatTotalWorkHours,
  formatWorkDuration,
  formatWorkHours,
  isInvalidWorkTimeRange,
  needsMorningClaim,
  rebuildDailyHours,
  requiresMorningClaimSelection,
  showsWeekendMorningInfo,
  withUpdatedDayTimes,
} from "@/lib/daily-hours";
import {
  eligibleMeals,
  formatMealSummary,
  rebuildDailyMeals,
} from "@/lib/daily-meals";
import { formatCurrency, formatDateRange, formatDisplayDate } from "@/lib/format";
import { isLocalRegion } from "@/lib/attachment-rates";
import { REGIONS, normalizeRegion } from "@/lib/regions";
import {
  calcPersonAllowances,
  collectRentHalfPersonIds,
  isRentHalfParticipant,
} from "@/lib/attachment-text";
import {
  clearLocalUnsupportedCosts,
  cloneReportFormFrom,
  isCopyableSource,
} from "@/lib/report-form-copy";
import { getMissingRequiredLabels } from "@/lib/report-validation";
import {
  TRANSPORT_MODES,
  calcCostLineTotal,
  createLodgingItem,
  createTransportItem,
  sumCostLines,
  withTransportPeople,
} from "@/lib/transport-cost";
import type {
  CostLineItem,
  DailyMeal,
  LodgingCostItem,
  MorningClaim,
  Participant,
  Person,
  ReportForm,
  TransportCostItem,
  TransportMode,
} from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

const MEAL_OPTIONS: {
  key: keyof Pick<DailyMeal, "breakfast" | "lunch" | "dinner">;
  label: string;
}[] = [
  { key: "breakfast", label: "조식" },
  { key: "lunch", label: "중식" },
  { key: "dinner", label: "석식" },
];

type FormAlign = "left" | "center";

type ReportFormPanelProps = {
  participant: Participant | null;
  form: ReportForm | null;
  directoryPeople?: Person[];
  /** 같은 출장의 다른 참여자 포함(렌트 일비 반액 판정용) */
  tripParticipants?: Participant[];
  tripStartDate?: string;
  tripEndDate?: string;
  saving?: boolean;
  onChange: (next: ReportForm) => void;
  onDraftSave: () => void;
  onSubmit: () => void;
};

function FormSection({
  title,
  description,
  children,
  disabled = false,
  disabledMessage,
}: {
  title: string;
  description: string;
  children: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  return (
    <section
      className={`grid grid-cols-1 gap-4 border-b border-[#E5E8EB] py-5 last:border-b-0 md:grid-cols-[188px_minmax(0,1fr)] md:gap-0 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="md:pr-5">
        <h3 className="text-[15px] font-bold leading-6 text-[#191F28]">
          {title}
        </h3>
        <p className="mt-1.5 text-[12px] leading-5 text-[#8B95A1]">
          {description}
        </p>
      </div>
      <div className="min-w-0 md:border-l md:border-[#E5E8EB] md:pl-5">
        {disabled ? (
          <div className="rounded-xl border border-dashed border-[#D1D6DB] bg-[#F9FAFB] px-4 py-5">
            <p className="text-[13px] font-semibold text-[#4E5968]">
              {disabledMessage ?? "이 항목은 현재 사용할 수 없습니다."}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-[13px] text-[#8B95A1]">{label}</span>
      <span className="text-right text-[13px] font-semibold text-[#191F28]">
        {value}
      </span>
    </div>
  );
}

function parseDigitsOnly(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const next = Number(digits);
  if (!Number.isFinite(next) || next < 0) return 0;
  return Math.floor(next);
}

function formatAmountInput(value: number): string {
  if (!value) return "";
  return formatCurrency(value);
}

const numberInputClassName =
  "h-9 w-full rounded-lg border border-[#E5E8EB] bg-white px-2 text-right text-[13px] tabular-nums text-[#191F28] outline-none transition [appearance:textfield] focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** 교통비/숙박비 공통 고정 그리드: 수단 | 금액+원 | × | 인원+인(+배지) | × | 회수/일수 | = | 총합 | 삭제 */
const costRowGridClassName =
  "grid w-full grid-cols-[104px_112px_12px_108px_12px_64px_12px_100px_28px] items-center gap-x-1.5 overflow-visible rounded-2xl bg-[#F9FAFB] px-2.5 py-2";

function isCostLineFilled(
  item: Pick<CostLineItem, "amount" | "people" | "times"> & {
    mode?: string;
  },
): boolean {
  return (
    Boolean(item.mode) ||
    item.amount > 0 ||
    item.people > 0 ||
    item.times > 0
  );
}

function CostLineRow({
  modeSlot,
  amount,
  people,
  times,
  peopleReadOnly = false,
  peopleBadge,
  timesUnit = "회",
  amountPlaceholder,
  onChange,
  onRemove,
  removeLabel,
  footer,
}: {
  modeSlot?: ReactNode;
  amount: number;
  people: number;
  times: number;
  peopleReadOnly?: boolean;
  /** peopleReadOnly일 때 표시할 배지 (예: 자동, 고정) */
  peopleBadge?: string;
  timesUnit?: "회" | "일";
  amountPlaceholder?: string;
  onChange: (
    patch: Partial<Pick<CostLineItem, "amount" | "people" | "times">>,
  ) => void;
  onRemove: () => void;
  removeLabel: string;
  footer?: ReactNode;
}) {
  const rowTotal = calcCostLineTotal({ id: "", amount, people, times });

  return (
    <div className="space-y-2 rounded-2xl bg-[#F9FAFB] px-2.5 py-2">
      <div className={`${costRowGridClassName} !rounded-none !bg-transparent !p-0`}>
        <div className="min-w-0">{modeSlot ?? null}</div>

        <div className="flex min-w-0 items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            aria-label="금액"
            placeholder={amountPlaceholder}
            className={`${numberInputClassName} placeholder:text-[11px] placeholder:font-medium placeholder:text-[#B0B8C1]`}
            value={formatAmountInput(amount)}
            onChange={(e) =>
              onChange({ amount: parseDigitsOnly(e.target.value) })
            }
          />
          <span className="shrink-0 text-[12px] font-semibold text-[#8B95A1]">
            원
          </span>
        </div>

        <span className="text-center text-[13px] font-semibold text-[#8B95A1]">
          ×
        </span>

        <div className="flex min-w-0 items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              inputMode="numeric"
              aria-label={
                peopleReadOnly
                  ? peopleBadge === "고정"
                    ? "인원 (본인 1인 고정)"
                    : "인원 (자동 계산, 수정 불가)"
                  : "인원"
              }
              title={
                peopleReadOnly
                  ? peopleBadge === "고정"
                    ? "작성자 본인 1인으로 고정됩니다"
                    : "인원 선택에 따라 자동 계산됩니다 (수정 불가)"
                  : undefined
              }
              readOnly={peopleReadOnly}
              tabIndex={peopleReadOnly ? -1 : undefined}
              className={`${numberInputClassName} ${
                peopleReadOnly
                  ? "cursor-not-allowed border-dashed bg-[#EEF0F3] text-[#6B7684]"
                  : ""
              }`}
              value={people || ""}
              onChange={(e) => {
                if (peopleReadOnly) return;
                onChange({ people: parseDigitsOnly(e.target.value) });
              }}
            />
          </div>
          <span className="shrink-0 text-[12px] font-semibold text-[#8B95A1]">
            인
          </span>
          {peopleReadOnly && peopleBadge ? (
            <span className="shrink-0 rounded-md bg-[#E5E8EB] px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-[#6B7684]">
              {peopleBadge}
            </span>
          ) : null}
        </div>

        <span className="text-center text-[13px] font-semibold text-[#8B95A1]">
          ×
        </span>

        <div className="flex min-w-0 items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            aria-label={timesUnit === "일" ? "일수" : "회수"}
            className={numberInputClassName}
            value={times || ""}
            onChange={(e) =>
              onChange({ times: parseDigitsOnly(e.target.value) })
            }
          />
          <span className="shrink-0 text-[12px] font-semibold text-[#8B95A1]">
            {timesUnit}
          </span>
        </div>

        <span className="text-center text-[13px] font-semibold text-[#8B95A1]">
          =
        </span>

        <div className="flex h-9 w-full items-center justify-end rounded-lg bg-[#F2F8FF] px-2.5">
          <p className="truncate text-right text-[12px] font-bold tabular-nums text-[#3182F6]">
            {formatCurrency(rowTotal)}원
          </p>
        </div>

        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center justify-self-end rounded-lg bg-[#E5E8EB] text-[15px] font-bold leading-none text-[#4E5968] transition-colors hover:bg-[#FFE5E7] hover:text-[#F04452]"
        >
          −
        </button>
      </div>
      {footer}
    </div>
  );
}

function resolveAuthorPersonId(
  participant: Participant,
  people: Person[],
): string | null {
  if (participant.personId) return participant.personId;
  const matched = people.find((person) => person.name === participant.name);
  return matched?.id ?? null;
}

function ensurePersonIds(
  personIds: string[] | undefined,
  authorPersonId: string | null,
): string[] {
  const source = Array.isArray(personIds) ? personIds : [];
  if (!authorPersonId) return [...new Set(source)];
  if (source.includes(authorPersonId)) return [...new Set(source)];
  return [authorPersonId, ...source];
}

function ensureTransportPersonIds(
  item: TransportCostItem,
  authorPersonId: string | null,
): string[] {
  return ensurePersonIds(item.personIds, authorPersonId);
}

function selectedPeopleCount(
  personIds: string[],
  authorPersonId: string | null,
): number {
  if (authorPersonId) return personIds.length;
  return personIds.length + 1;
}

function PeopleSelector({
  authorName,
  authorPersonId,
  people,
  selectedIds,
  onChange,
  label = "렌트 탑승 인원",
  pickerTitle = "렌트 탑승 인원 선택",
}: {
  authorName: string;
  authorPersonId: string | null;
  people: Person[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  label?: string;
  pickerTitle?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  const selectedPeople = selectedIds
    .map((id) => peopleById.get(id))
    .filter((person): person is Person => Boolean(person));

  const filteredPeople = useMemo(() => {
    const selectable = people.filter(
      (person) =>
        !isResignedPerson(person) ||
        selectedIds.includes(person.id) ||
        person.id === authorPersonId,
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return selectable;
    return selectable.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.rank.toLowerCase().includes(query) ||
        person.department.toLowerCase().includes(query),
    );
  }, [people, searchQuery, selectedIds, authorPersonId]);

  const openPicker = () => {
    setDraftIds(selectedIds);
    setSearchQuery("");
    setPickerOpen(true);
  };

  const removePerson = (personId: string) => {
    if (personId === authorPersonId) return;
    const next = selectedIds.filter((id) => id !== personId);
    if (authorPersonId && !next.includes(authorPersonId)) {
      next.unshift(authorPersonId);
    }
    onChange(next);
  };

  const confirmPicker = () => {
    const next = [...draftIds];
    if (authorPersonId && !next.includes(authorPersonId)) {
      next.unshift(authorPersonId);
    }
    onChange(next);
    setPickerOpen(false);
  };

  useDialogKeyboard({
    enabled: pickerOpen,
    onConfirm: confirmPicker,
    onCancel: () => setPickerOpen(false),
  });

  return (
    <>
      <div className="rounded-xl border border-[#E5E8EB] bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-[#8B95A1]">
            {label}
            <span className="ml-1 font-medium text-[#B0B8C1]">
              · 선택 시 인원 수 자동 반영
            </span>
          </p>
          <button
            type="button"
            onClick={openPicker}
            className="rounded-lg bg-[#F2F8FF] px-2.5 py-1 text-[12px] font-bold text-[#3182F6] transition-colors hover:bg-[#E8F3FF]"
          >
            + 인원 추가
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {!authorPersonId ? (
            <span className="inline-flex items-center rounded-full bg-[#EEF0F3] px-2.5 py-1 text-[12px] font-semibold text-[#4E5968]">
              {authorName}
              <span className="ml-1 text-[11px] font-medium text-[#8B95A1]">
                본인
              </span>
            </span>
          ) : null}

          {selectedPeople.map((person) => {
            const isAuthor = person.id === authorPersonId;
            return (
              <span
                key={person.id}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                  isAuthor
                    ? "bg-[#EEF0F3] text-[#4E5968]"
                    : "bg-[#F2F8FF] text-[#3182F6]"
                }`}
              >
                <PersonNameLabel
                  name={person.name}
                  resigned={isResignedPerson(person)}
                />
                {isAuthor ? (
                  <span className="text-[11px] font-medium text-[#8B95A1]">
                    본인
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`${person.name} 제거`}
                    onClick={() => removePerson(person.id)}
                    className="ml-0.5 text-[14px] leading-none text-[#8B95A1] hover:text-[#F04452]"
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[80vh] w-full max-w-[440px] flex-col rounded-2xl bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-[#191F28]">
              {pickerTitle}
            </h3>
            <p className="mt-1 text-[13px] text-[#8B95A1]">
              회사 인원에서 검색해 선택합니다. 작성자 본인은 기본 포함됩니다.
            </p>

            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 직급, 소속팀 검색"
              className="mt-4 h-11 w-full rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 text-[14px] outline-none transition focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15"
            />

            <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border border-[#E5E8EB] p-2">
              {filteredPeople.map((person) => {
                const isAuthor = person.id === authorPersonId;
                const checked = draftIds.includes(person.id) || isAuthor;
                return (
                  <label
                    key={person.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      checked ? "bg-[#F2F8FF]" : "hover:bg-[#F9FAFB]"
                    } ${isAuthor ? "cursor-default" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isAuthor}
                      onChange={() => {
                        if (isAuthor) return;
                        setDraftIds((prev) =>
                          prev.includes(person.id)
                            ? prev.filter((id) => id !== person.id)
                            : [...prev, person.id],
                        );
                      }}
                      className="h-4 w-4 accent-[#3182F6] disabled:opacity-70"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-1.5 truncate text-[14px] font-bold text-[#191F28]">
                        <PersonNameLabel
                          name={person.name}
                          resigned={isResignedPerson(person)}
                          className="truncate"
                        />
                        {person.rank ? (
                          <span className="shrink-0 text-[13px] font-medium text-[#8B95A1]">
                            {person.rank}
                          </span>
                        ) : null}
                        {isAuthor ? (
                          <span className="shrink-0 text-[12px] font-medium text-[#8B95A1]">
                            (본인)
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-[#8B95A1]">
                        {person.department}
                      </span>
                    </span>
                  </label>
                );
              })}
              {filteredPeople.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-[#8B95A1]">
                  검색 결과가 없습니다
                </p>
              ) : null}
            </div>

            <p className="mt-3 text-[12px] font-semibold text-[#4E5968]">
              선택{" "}
              <span className="text-[#3182F6]">
                {new Set([
                  ...draftIds,
                  ...(authorPersonId ? [authorPersonId] : []),
                ]).size + (authorPersonId ? 0 : 1)}
              </span>
              명
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={confirmPicker}
                className="rounded-xl bg-[#3182F6] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#1B64DA]"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] hover:bg-[#E5E8EB]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function isLodgingLineFilled(item: LodgingCostItem): boolean {
  return item.amount > 0 || item.times > 0;
}

export function ReportFormPanel({
  participant,
  form,
  directoryPeople = [],
  tripParticipants = [],
  tripStartDate = "",
  tripEndDate = "",
  saving = false,
  onChange,
  onDraftSave,
  onSubmit,
}: ReportFormPanelProps) {
  const [formAlign, setFormAlign] = useState<FormAlign>("left");
  const [costDeleteTarget, setCostDeleteTarget] = useState<
    | { type: "transport"; id: string }
    | { type: "lodging"; id: string }
    | null
  >(null);
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);

  const authorPersonId = participant
    ? resolveAuthorPersonId(participant, directoryPeople)
    : null;

  useEffect(() => {
    if (!form) return;
    const normalized = normalizeRegion(form.region ?? "");
    if (normalized !== (form.region ?? "")) {
      const next = { ...form, region: normalized };
      onChange(
        isLocalRegion(normalized) ? clearLocalUnsupportedCosts(next) : next,
      );
      return;
    }
    if (!isLocalRegion(form.region ?? "")) return;
    const hasBizMeals = (form.dailyMeals ?? []).some(
      (meal) => meal.breakfast || meal.lunch || meal.dinner,
    );
    const hasTransport = (form.transportItems ?? []).length > 0;
    const hasLodging = (form.lodgingItems ?? []).length > 0;
    if (!hasBizMeals && !hasTransport && !hasLodging) return;
    onChange(clearLocalUnsupportedCosts(form));
    // 관내(서울)에서는 식비·교통·숙박 입력을 비우고 보정합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id, form?.region, form?.dailyMeals, form?.transportItems, form?.lodgingItems]);

  useEffect(() => {
    if (!form) return;
    const hoursByDate = new Map(
      form.dailyHours.map((day) => [day.date, day] as const),
    );
    let changed = false;
    const nextMeals = form.dailyMeals.map((meal) => {
      const eligible = eligibleMeals(hoursByDate.get(meal.date));
      const next = { ...meal };
      for (const option of MEAL_OPTIONS) {
        if (!eligible[option.key] && next[option.key]) {
          next[option.key] = false;
          changed = true;
        }
      }
      return next;
    });
    if (!changed) return;
    onChange({ ...form, dailyMeals: nextMeals });
    // 근무시간과 무관한 사추비 선택을 해제합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id, form?.dailyHours, form?.dailyMeals]);

  useEffect(() => {
    if (!participant || !form) return;
    const authorId = resolveAuthorPersonId(participant, directoryPeople);
    const transportSource = form.transportItems ?? [];
    const lodgingSource = form.lodgingItems ?? [];

    const nextTransports = transportSource.map((item) => {
      if (!Array.isArray(item.personIds)) {
        return { ...item, personIds: [] as string[] };
      }
      if (item.mode !== "렌트") {
        return item.personIds.length === 0
          ? item
          : { ...item, personIds: [] };
      }
      const ids = ensureTransportPersonIds(item, authorId);
      return withTransportPeople(item, ids, authorId ? 0 : 1);
    });

    const nextLodgings = lodgingSource.map((item) =>
      item.people === 1 ? item : { ...item, people: 1 },
    );

    const transportChanged = nextTransports.some((item, index) => {
      const prev = transportSource[index];
      if (!prev) return true;
      return (
        item.people !== prev.people ||
        (item.personIds ?? []).join(",") !== (prev.personIds ?? []).join(",")
      );
    });
    const lodgingChanged = nextLodgings.some(
      (item, index) => item.people !== lodgingSource[index]?.people,
    );
    const needsArray =
      !Array.isArray(form.transportItems) || !Array.isArray(form.lodgingItems);

    if (!needsArray && !transportChanged && !lodgingChanged) return;

    onChange({
      ...form,
      transportItems: nextTransports,
      lodgingItems: nextLodgings,
    });
    // 이전 스키마 잔여 상태·렌트 인원·숙박 1인 고정을 보정합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id, form, directoryPeople]);

  useEffect(() => {
    if (!participant || !form || !tripStartDate || !tripEndDate) return;
    if (form.startDate && form.endDate) return;

    const startDate = form.startDate || tripStartDate;
    const endDate = form.endDate || tripEndDate;
    const resolvedEnd = endDate < startDate ? startDate : endDate;

    onChange({
      ...form,
      startDate,
      endDate: resolvedEnd,
      dailyHours: rebuildDailyHours(startDate, resolvedEnd, form.dailyHours),
      dailyMeals: rebuildDailyMeals(startDate, resolvedEnd, form.dailyMeals),
      transportItems: form.transportItems ?? [],
      lodgingItems: form.lodgingItems ?? [],
    });
    // 일정 미입력 시에만 출장 목록 날짜로 채웁니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant?.id, tripStartDate, tripEndDate, form?.startDate, form?.endDate]);

  useDialogKeyboard({
    enabled: Boolean(costDeleteTarget && form) && !copyPickerOpen,
    onConfirm: () => {
      if (!costDeleteTarget || !form) return;
      if (costDeleteTarget.type === "transport") {
        onChange({
          ...form,
          transportItems: (form.transportItems ?? []).filter(
            (row) => row.id !== costDeleteTarget.id,
          ),
        });
      } else {
        onChange({
          ...form,
          lodgingItems: (form.lodgingItems ?? []).filter(
            (row) => row.id !== costDeleteTarget.id,
          ),
        });
      }
      setCostDeleteTarget(null);
    },
    onCancel: () => setCostDeleteTarget(null),
  });

  const copySources = useMemo(() => {
    if (!participant) return [];
    return tripParticipants.filter(
      (row) => row.id !== participant.id && isCopyableSource(row),
    );
  }, [participant, tripParticipants]);

  const selectedCopySource =
    copySources.find((row) => row.id === copySourceId) ?? null;

  useDialogKeyboard({
    enabled: copyPickerOpen && !costDeleteTarget,
    confirmDisabled: !selectedCopySource,
    onConfirm: () => {
      if (!selectedCopySource || !participant) return;
      onChange(
        cloneReportFormFrom(selectedCopySource, authorPersonId),
      );
      setCopyPickerOpen(false);
      setCopySourceId(null);
    },
    onCancel: () => {
      setCopyPickerOpen(false);
      setCopySourceId(null);
    },
  });

  const rentHalfPersonIds = useMemo(() => {
    if (!participant || !form) return new Set<string>();
    const liveParticipant = { ...participant, form };
    const others = tripParticipants.filter(
      (row) => row.id !== participant.id,
    );
    return collectRentHalfPersonIds([...others, liveParticipant]);
  }, [participant, form, tripParticipants]);

  if (!participant || !form) {
    return (
      <section className="flex h-full w-[70%] flex-1 items-center justify-center bg-[#F2F4F6]">
        <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <p className="text-[15px] font-bold text-[#191F28]">
            참여자를 선택해 주세요
          </p>
          <p className="mt-2 text-[13px] text-[#8B95A1]">
            좌측에서 출장과 인원을 선택하면 복명서 입력폼이 표시됩니다.
          </p>
        </div>
      </section>
    );
  }

  const localUnsupported = isLocalRegion(form.region ?? "");
  const transportItems = localUnsupported ? [] : (form.transportItems ?? []);
  const lodgingItems = localUnsupported ? [] : (form.lodgingItems ?? []);
  const totalWorkHoursLabel = formatTotalWorkHours(form.dailyHours);
  const transportTotal = sumCostLines(transportItems);
  const lodgingTotal = sumCostLines(lodgingItems);
  const { dailyAllowance, mealPay } = calcPersonAllowances(
    { ...participant, form },
    { rentHalfPersonIds, people: directoryPeople },
  );
  const rentHalfApplied = isRentHalfParticipant(
    { ...participant, form },
    rentHalfPersonIds,
    directoryPeople,
  );
  const totalCost =
    dailyAllowance + mealPay + transportTotal + lodgingTotal;
  const localUnsupportedLabel = "관내 미지원";
  const missingRequiredLabels = getMissingRequiredLabels(form);
  const canSubmit = missingRequiredLabels.length === 0;

  const updateTransportItem = (
    itemId: string,
    patch: Partial<TransportCostItem>,
  ) => {
    onChange({
      ...form,
      transportItems: transportItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    });
  };

  const updateTransportPeople = (
    item: TransportCostItem,
    nextIds: string[],
  ) => {
    updateTransportItem(
      item.id,
      withTransportPeople(item, nextIds, authorPersonId ? 0 : 1),
    );
  };

  const updateLodgingItem = (
    itemId: string,
    patch: Partial<LodgingCostItem>,
  ) => {
    onChange({
      ...form,
      lodgingItems: lodgingItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    });
  };

  const removeTransportItem = (itemId: string) => {
    onChange({
      ...form,
      transportItems: transportItems.filter((row) => row.id !== itemId),
    });
  };

  const removeLodgingItem = (itemId: string) => {
    onChange({
      ...form,
      lodgingItems: lodgingItems.filter((row) => row.id !== itemId),
    });
  };

  const requestRemoveTransportItem = (item: TransportCostItem) => {
    if (!isCostLineFilled(item)) {
      removeTransportItem(item.id);
      return;
    }
    setCostDeleteTarget({ type: "transport", id: item.id });
  };

  const requestRemoveLodgingItem = (item: LodgingCostItem) => {
    if (!isLodgingLineFilled(item)) {
      removeLodgingItem(item.id);
      return;
    }
    setCostDeleteTarget({ type: "lodging", id: item.id });
  };

  return (
    <section className="flex h-full w-[70%] flex-1 flex-col bg-[#F2F4F6]">
      <header className="flex items-center justify-between border-b border-[#E5E8EB] bg-white px-6 py-4">
        <div>
          <p className="text-[13px] font-semibold text-[#8B95A1]">
            출장비 데이터 입력폼
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#191F28]">
              <PersonNameLabel
                name={participant.name}
                resigned={
                  !!participant.personId &&
                  isResignedPerson(
                    directoryPeople.find((p) => p.id === participant.personId),
                  )
                }
              />
            </h2>
            <StatusBadge status={participant.status} />
          </div>
          <p className="mt-1 text-[13px] text-[#8B95A1]">
            {participant.department}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#8B95A1]">
              정렬
            </span>
            <div className="flex rounded-xl bg-[#F2F4F6] p-1">
              {(
                [
                  { value: "left", label: "왼쪽" },
                  { value: "center", label: "가운데" },
                ] as const
              ).map((option) => {
                const selected = formAlign === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormAlign(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
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
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              disabled={saving || copySources.length === 0}
              title={
                copySources.length === 0
                  ? "복사할 작성 내역이 없습니다"
                  : "같은 출장의 다른 참여자 입력을 불러옵니다"
              }
              onClick={() => {
                setCopySourceId(null);
                setCopyPickerOpen(true);
              }}
              className="rounded-xl border border-[#E5E8EB] bg-white px-4 py-2.5 text-[14px] font-bold text-[#4E5968] transition-colors hover:border-[#3182F6] hover:bg-[#F2F8FF] hover:text-[#3182F6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#E5E8EB] disabled:hover:bg-white disabled:hover:text-[#4E5968]"
            >
              다른 참여자에서 불러오기
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onDraftSave}
              className="rounded-xl bg-[#F2F4F6] px-4 py-2.5 text-[14px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "저장 중…" : "임시 저장"}
            </button>
            <button
              type="button"
              disabled={saving || !canSubmit}
              onClick={onSubmit}
              title={
                canSubmit
                  ? "필수 입력을 모두 채웠습니다. 제출할 수 있습니다."
                  : missingRequiredLabels.length > 0
                    ? `미입력: ${missingRequiredLabels.join(", ")}`
                    : "필수값을 모두 입력해야 제출할 수 있습니다."
              }
              className="rounded-xl bg-[#3182F6] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#1B64DA] disabled:cursor-not-allowed disabled:bg-[#B0B8C1] disabled:hover:bg-[#B0B8C1]"
            >
              제출
            </button>
            {!canSubmit && missingRequiredLabels.length > 0 ? (
              <p className="pointer-events-none absolute top-full right-0 mt-1.5 whitespace-nowrap text-right text-[11px] font-medium leading-4 text-[#8B95A1]">
                미입력: {missingRequiredLabels.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div
          className={`flex w-full max-w-[1180px] items-start gap-6 ${
            formAlign === "center" ? "mx-auto" : "mr-auto"
          }`}
        >
          <div className="min-w-0 flex-1 rounded-2xl border border-[#E5E8EB] bg-white px-5">
            <FormSection
              title="1. 지역 선택"
              description="관내(서울) 또는 관외를 선택합니다. 관내는 일비만 지원되며 식비·교통비·숙박비는 입력할 수 없습니다."
            >
              <SelectDropdown
                label="지역"
                value={form.region}
                options={REGIONS}
                placeholder="관내/관외 선택"
                className="max-w-[220px]"
                onChange={(nextRegion) => {
                  const next = { ...form, region: nextRegion };
                  onChange(
                    isLocalRegion(nextRegion)
                      ? clearLocalUnsupportedCosts(next)
                      : next,
                  );
                }}
              />
            </FormSection>

            <FormSection
              title="2. 출장 일정"
              description="출장 목록의 일정이 기본으로 채워지며, 필요하면 수정할 수 있습니다."
            >
              <div className="flex flex-wrap items-end gap-3">
                <DatePicker
                  label="시작일"
                  value={form.startDate}
                  placeholder="시작일 선택"
                  className="w-[168px]"
                  onChange={(nextDate) => {
                    const endDate =
                      form.endDate && form.endDate >= nextDate
                        ? form.endDate
                        : nextDate;
                    onChange({
                      ...form,
                      startDate: nextDate,
                      endDate,
                      dailyHours: rebuildDailyHours(
                        nextDate,
                        endDate,
                        form.dailyHours,
                      ),
                      dailyMeals: rebuildDailyMeals(
                        nextDate,
                        endDate,
                        form.dailyMeals,
                      ),
                    });
                  }}
                />
                <DatePicker
                  label="종료일"
                  value={form.endDate}
                  min={form.startDate}
                  placeholder="종료일 선택"
                  className="w-[168px]"
                  onChange={(nextDate) => {
                    const startDate = form.startDate || nextDate;
                    const endDate =
                      nextDate < startDate ? startDate : nextDate;
                    onChange({
                      ...form,
                      startDate,
                      endDate,
                      dailyHours: rebuildDailyHours(
                        startDate,
                        endDate,
                        form.dailyHours,
                      ),
                      dailyMeals: rebuildDailyMeals(
                        startDate,
                        endDate,
                        form.dailyMeals,
                      ),
                    });
                  }}
                />
              </div>
            </FormSection>

            <FormSection
              title="3. 날짜별 근무시간"
              description="출장 일정의 날짜별로 업무시작·마감을 선택하면 근무시간이 자동 계산됩니다. 평일은 08:00 이전 시작 시 시간외수당/조식 중 하나를 선택해 주세요. 주말·공휴일은 09:00 근무 포함 시 시간외수당과 조식 모두 지급 가능합니다."
            >
              {form.dailyHours.length === 0 ? (
                <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-[#4E5968]">
                    표시할 날짜가 없습니다
                  </p>
                  <p className="mt-1 text-[12px] text-[#8B95A1]">
                    먼저 출장 일정의 시작일·종료일을 선택해 주세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.dailyHours.map((item, index) => {
                    const invalidRange = isInvalidWorkTimeRange(
                      item.startTime,
                      item.endTime,
                    );
                    const showMorningClaim = needsMorningClaim(
                      item.startTime,
                      item.endTime,
                      item.date,
                    );
                    const showWeekendInfo = showsWeekendMorningInfo(
                      item.startTime,
                      item.endTime,
                      item.date,
                    );
                    const morningChoiceRequired = requiresMorningClaimSelection(
                      item.startTime,
                      item.endTime,
                      item.date,
                    );

                    return (
                      <div
                        key={item.date}
                        className="space-y-2 rounded-2xl bg-[#F9FAFB] p-3"
                      >
                        <div className="grid items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)_108px]">
                          <div>
                            <p className="mb-1.5 text-center text-[12px] font-semibold text-[#8B95A1]">
                              날짜
                            </p>
                            <div
                              aria-readonly="true"
                              title="출장 일정에서 자동으로 채워진 날짜입니다"
                              className="flex h-11 select-none items-center justify-center rounded-xl bg-[#EEF0F3] px-3 text-center text-[13px] font-semibold tabular-nums text-[#6B7684]"
                            >
                              {formatDisplayDate(item.date)}
                            </div>
                          </div>
                          <TimePicker
                            label="업무시작"
                            value={item.startTime}
                            placeholder="시작"
                            onChange={(startTime) => {
                              const nextHours = [...form.dailyHours];
                              nextHours[index] = withUpdatedDayTimes(item, {
                                startTime,
                              });
                              onChange({ ...form, dailyHours: nextHours });
                            }}
                          />
                          <TimePicker
                            label="업무마감"
                            value={item.endTime}
                            placeholder="마감"
                            onChange={(endTime) => {
                              const nextHours = [...form.dailyHours];
                              nextHours[index] = withUpdatedDayTimes(item, {
                                endTime,
                              });
                              onChange({ ...form, dailyHours: nextHours });
                            }}
                          />
                          <div>
                            <p className="mb-1.5 text-center text-[12px] font-semibold text-[#8B95A1]">
                              업무시간
                            </p>
                            <div
                              className={`flex h-11 items-center justify-center rounded-xl px-2 ${
                                invalidRange ? "bg-[#FFF5F6]" : "bg-[#F2F8FF]"
                              }`}
                            >
                              {invalidRange ? (
                                <p className="text-center text-[12px] font-bold leading-4 text-[#F04452]">
                                  시간 수정
                                  <br />
                                  필요
                                </p>
                              ) : (
                                <p className="text-center text-[14px] font-bold tabular-nums text-[#3182F6]">
                                  {item.startTime && item.endTime
                                    ? formatWorkDuration(
                                        item.startTime,
                                        item.endTime,
                                      )
                                    : formatWorkHours(item.hours)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {showWeekendInfo ? (
                          <div className="rounded-xl border border-[#D6E8FF] bg-[#F2F8FF] px-3 py-2.5">
                            <p className="text-[12px] font-semibold text-[#3182F6]">
                              주말·공휴일
                            </p>
                            <p className="mt-1 text-[12px] leading-5 text-[#4E5968]">
                              시간외수당과 조식 모두 지급 가능합니다. (조식은
                              09:00 근무 포함 시 자동 반영)
                            </p>
                          </div>
                        ) : null}

                        {showMorningClaim ? (
                          <div className="rounded-xl border border-[#D6E8FF] bg-[#F2F8FF] px-3 py-2.5">
                            <p className="text-[12px] font-semibold text-[#3182F6]">
                              오전 08:00~09:00 청구 방식
                              {morningChoiceRequired && !item.morningClaim ? (
                                <span className="ml-1 font-bold text-[#F04452]">
                                  (필수)
                                </span>
                              ) : null}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-4">
                              {(
                                [
                                  {
                                    value: "overtime" as MorningClaim,
                                    label: "시간외수당",
                                  },
                                  {
                                    value: "breakfast" as MorningClaim,
                                    label: "조식",
                                  },
                                ] as const
                              ).map((option) => {
                                const selected =
                                  item.morningClaim === option.value;
                                return (
                                  <label
                                    key={option.value}
                                    className="flex cursor-pointer items-center gap-2"
                                  >
                                    <input
                                      type="radio"
                                      name={`morning-claim-${item.date}`}
                                      checked={selected}
                                      onChange={() => {
                                        const nextHours = [...form.dailyHours];
                                        nextHours[index] = withUpdatedDayTimes(
                                          item,
                                          { morningClaim: option.value },
                                        );
                                        onChange({
                                          ...form,
                                          dailyHours: nextHours,
                                        });
                                      }}
                                      className="h-4 w-4 accent-[#3182F6]"
                                    />
                                    <span className="text-[13px] font-semibold text-[#4E5968]">
                                      {option.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>

            <FormSection
              title="※ 사업추진비 사용여부"
              description="근무시간에 포함되는 끼니만 선택할 수 있습니다. 선택한 끼니는 식비 지급에서 제외되고 붙임 자료에 사추비로 표기됩니다."
              disabled={localUnsupported}
              disabledMessage="관내(서울) 출장은 식비가 지원되지 않아 사업추진비를 입력하지 않습니다."
            >
              <details className="group mb-3 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] px-3.5 py-2.5 text-[12px] leading-5 text-[#6B7684] open:pb-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-[#4E5968] [&::-webkit-details-marker]:hidden">
                  <span>선택 가능 기준 보기</span>
                  <span className="text-[11px] font-medium text-[#8B95A1] group-open:hidden">
                    펼치기
                  </span>
                  <span className="hidden text-[11px] font-medium text-[#8B95A1] group-open:inline">
                    접기
                  </span>
                </summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-4">
                  <li>조식: 근무 구간에 09:00 포함 (08:00 이전 근무 시 오전 청구방식이 조식인 경우만)</li>
                  <li>중식: 근무 구간에 12:00 포함</li>
                  <li>석식: 근무 구간에 18:00 포함</li>
                </ul>
                <p className="mt-1.5">
                  위 기준에 해당하지 않는 끼니는 비활성화되며, 근무시간을 먼저 입력해야 선택할 수 있습니다.
                </p>
              </details>
              {form.dailyMeals.length === 0 ? (
                <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-[#4E5968]">
                    표시할 날짜가 없습니다
                  </p>
                  <p className="mt-1 text-[12px] text-[#8B95A1]">
                    먼저 출장 일정의 시작일·종료일을 선택해 주세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.dailyMeals.map((item, index) => {
                    const workDay = form.dailyHours.find(
                      (day) => day.date === item.date,
                    );
                    const eligible = eligibleMeals(workDay);

                    return (
                      <div
                        key={item.date}
                        className="grid items-center gap-3 rounded-2xl bg-[#F9FAFB] p-3 sm:grid-cols-[112px_minmax(0,1fr)]"
                      >
                        <div
                          aria-readonly="true"
                          title="출장 일정에서 자동으로 채워진 날짜입니다"
                          className="flex h-11 select-none items-center justify-center rounded-xl bg-[#EEF0F3] px-3 text-center text-[13px] font-semibold tabular-nums text-[#6B7684]"
                        >
                          {formatDisplayDate(item.date)}
                        </div>
                        <div className="flex flex-wrap items-center gap-5 px-1">
                          {MEAL_OPTIONS.map((option) => {
                            const checked = item[option.key];
                            const enabled = eligible[option.key];
                            const disabledReason = !workDay?.startTime?.trim() ||
                            !workDay?.endTime?.trim()
                              ? "근무시간을 먼저 입력해 주세요"
                              : `${option.label}은 근무 구간에 해당 시각이 포함될 때만 선택할 수 있습니다`;

                            return (
                              <label
                                key={option.key}
                                title={enabled ? undefined : disabledReason}
                                className={`flex h-11 items-center gap-2 ${
                                  enabled
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed opacity-40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!enabled}
                                  onChange={() => {
                                    if (!enabled) return;
                                    const nextMeals = [...form.dailyMeals];
                                    nextMeals[index] = {
                                      ...item,
                                      [option.key]: !checked,
                                    };
                                    onChange({
                                      ...form,
                                      dailyMeals: nextMeals,
                                    });
                                  }}
                                  className="h-4 w-4 accent-[#3182F6] disabled:cursor-not-allowed"
                                />
                                <span
                                  className={`text-[14px] font-semibold ${
                                    enabled ? "text-[#4E5968]" : "text-[#8B95A1]"
                                  }`}
                                >
                                  {option.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>

            <FormSection
              title="4. 교통비"
              description="교통 수단별로 금액·인원·회수를 입력합니다. 렌트는 탑승 인원을 선택하면 인원 수가 자동 반영됩니다."
              disabled={localUnsupported}
              disabledMessage="관내(서울) 출장은 교통비가 지원되지 않습니다."
            >
              <div className="space-y-2">
                {transportItems.map((item) => {
                  const isRent = item.mode === "렌트";
                  const personIds = isRent
                    ? ensureTransportPersonIds(item, authorPersonId)
                    : [];
                  const peopleCount = isRent
                    ? selectedPeopleCount(personIds, authorPersonId)
                    : item.people;

                  return (
                    <CostLineRow
                      key={item.id}
                      modeSlot={
                        <SelectDropdown
                          value={item.mode}
                          options={TRANSPORT_MODES}
                          placeholder="선택"
                          className="w-full"
                          buttonClassName="!rounded-lg !px-2.5 !py-1.5 !text-[12px]"
                          onChange={(nextMode) => {
                            const mode = nextMode as TransportMode | "";
                            if (mode === "렌트") {
                              const ids = ensureTransportPersonIds(
                                { ...item, mode, personIds: item.personIds },
                                authorPersonId,
                              );
                              updateTransportItem(
                                item.id,
                                withTransportPeople(
                                  { ...item, mode },
                                  ids,
                                  authorPersonId ? 0 : 1,
                                ),
                              );
                              return;
                            }
                            updateTransportItem(item.id, {
                              mode,
                              personIds: [],
                            });
                          }}
                        />
                      }
                      amount={item.amount}
                      people={peopleCount}
                      times={item.times}
                      peopleReadOnly={isRent}
                      peopleBadge={isRent ? "자동" : undefined}
                      amountPlaceholder={isRent ? "주행 요금" : undefined}
                      onChange={(patch) => {
                        if (isRent) {
                          const { people: _ignored, ...rest } = patch;
                          updateTransportItem(item.id, rest);
                          return;
                        }
                        updateTransportItem(item.id, patch);
                      }}
                      onRemove={() => requestRemoveTransportItem(item)}
                      removeLabel="교통비 행 삭제"
                      footer={
                        isRent ? (
                          <div className="space-y-2">
                            <PeopleSelector
                              authorName={participant.name}
                              authorPersonId={authorPersonId}
                              people={directoryPeople}
                              selectedIds={personIds}
                              onChange={(nextIds) =>
                                updateTransportPeople(item, nextIds)
                              }
                            />
                            <p className="text-[12px] leading-5 text-[#6B7684]">
                              렌트 탑승 인원(작성자 포함)은 일비가 반액으로
                              계산됩니다.
                            </p>
                          </div>
                        ) : undefined
                      }
                    />
                  );
                })}

                {transportItems.length === 0 ? (
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center">
                    <p className="text-[14px] font-semibold text-[#4E5968]">
                      등록된 교통비가 없습니다
                    </p>
                    <p className="mt-1 text-[12px] text-[#8B95A1]">
                      아래 버튼으로 항목을 추가해 주세요
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...form,
                      transportItems: [
                        ...transportItems,
                        createTransportItem(),
                      ],
                    })
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D1D6DB] bg-white py-3 text-[13px] font-bold text-[#3182F6] transition-colors hover:border-[#3182F6] hover:bg-[#F2F8FF]"
                >
                  <span className="text-[16px] leading-none">+</span>
                  교통비 추가
                </button>

                {transportItems.length > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-[#F2F8FF] px-4 py-3">
                    <span className="text-[13px] font-semibold text-[#3182F6]">
                      교통비 합계
                    </span>
                    <span className="text-right text-[15px] font-bold tabular-nums text-[#191F28]">
                      {formatCurrency(transportTotal)}원
                    </span>
                  </div>
                ) : null}
              </div>
            </FormSection>

            <FormSection
              title="5. 숙박비"
              description="작성자 본인 1인 기준으로 금액과 숙박 일수를 입력합니다."
              disabled={localUnsupported}
              disabledMessage="관내(서울) 출장은 숙박비가 지원되지 않습니다."
            >
              <div className="space-y-2">
                {lodgingItems.map((item) => (
                  <CostLineRow
                    key={item.id}
                    amount={item.amount}
                    people={1}
                    times={item.times}
                    peopleReadOnly
                    peopleBadge="고정"
                    timesUnit="일"
                    onChange={(patch) => {
                      const { people: _ignored, ...rest } = patch;
                      updateLodgingItem(item.id, { ...rest, people: 1 });
                    }}
                    onRemove={() => requestRemoveLodgingItem(item)}
                    removeLabel="숙박비 행 삭제"
                  />
                ))}

                {lodgingItems.length === 0 ? (
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-8 text-center">
                    <p className="text-[14px] font-semibold text-[#4E5968]">
                      등록된 숙박비가 없습니다
                    </p>
                    <p className="mt-1 text-[12px] text-[#8B95A1]">
                      아래 버튼으로 항목을 추가해 주세요
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...form,
                      lodgingItems: [...lodgingItems, createLodgingItem()],
                    })
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D1D6DB] bg-white py-3 text-[13px] font-bold text-[#3182F6] transition-colors hover:border-[#3182F6] hover:bg-[#F2F8FF]"
                >
                  <span className="text-[16px] leading-none">+</span>
                  숙박비 추가
                </button>

                {lodgingItems.length > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-[#F2F8FF] px-4 py-3">
                    <span className="text-[13px] font-semibold text-[#3182F6]">
                      숙박비 합계
                    </span>
                    <span className="text-right text-[15px] font-bold tabular-nums text-[#191F28]">
                      {formatCurrency(lodgingTotal)}원
                    </span>
                  </div>
                ) : null}
              </div>
            </FormSection>
          </div>

          <aside className="sticky top-0 hidden w-[260px] shrink-0 xl:block">
            <div className="rounded-2xl border border-[#E5E8EB] bg-white p-5">
              <p className="text-[13px] font-semibold text-[#8B95A1]">
                입력 요약
              </p>
              <h3 className="mt-1 text-[16px] font-bold text-[#191F28]">
                <PersonNameLabel
                  name={participant.name}
                  resigned={
                    !!participant.personId &&
                    isResignedPerson(
                      directoryPeople.find((p) => p.id === participant.personId),
                    )
                  }
                />
              </h3>

              <div className="mt-4 divide-y divide-[#F2F4F6]">
                <SummaryRow
                  label="작성 상태"
                  value={participant.status}
                />
                <SummaryRow
                  label="지역"
                  value={form.region || "미입력"}
                />
                <SummaryRow
                  label="일정"
                  value={
                    form.startDate && form.endDate
                      ? formatDateRange(form.startDate, form.endDate)
                      : "미입력"
                  }
                />
                <SummaryRow
                  label="총 근무시간"
                  value={totalWorkHoursLabel}
                />
                <SummaryRow
                  label="일비"
                  value={`${formatCurrency(dailyAllowance)}원${
                    rentHalfApplied ? " (렌트 내역 적용)" : ""
                  }`}
                />
                <SummaryRow
                  label="식비"
                  value={
                    localUnsupported
                      ? localUnsupportedLabel
                      : `${formatCurrency(mealPay)}원`
                  }
                />
                <SummaryRow
                  label="사업추진비"
                  value={
                    localUnsupported
                      ? localUnsupportedLabel
                      : formatMealSummary(form.dailyMeals)
                  }
                />
                <SummaryRow
                  label="교통비"
                  value={
                    localUnsupported
                      ? localUnsupportedLabel
                      : `${formatCurrency(transportTotal)}원`
                  }
                />
                <SummaryRow
                  label="숙박비"
                  value={
                    localUnsupported
                      ? localUnsupportedLabel
                      : `${formatCurrency(lodgingTotal)}원`
                  }
                />
              </div>

              <div className="mt-4 rounded-xl bg-[#F2F8FF] px-3.5 py-3">
                <p className="text-[12px] font-semibold text-[#3182F6]">
                  비용 합계
                </p>
                <p className="mt-1 text-right text-[20px] font-bold tracking-tight tabular-nums text-[#191F28]">
                  {formatCurrency(totalCost)}원
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {costDeleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-[#191F28]">
              {costDeleteTarget.type === "transport"
                ? "교통비 항목을 삭제할까요?"
                : "숙박비 항목을 삭제할까요?"}
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-[#4E5968]">
              입력한 내용이 함께 삭제됩니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (costDeleteTarget.type === "transport") {
                    removeTransportItem(costDeleteTarget.id);
                  } else {
                    removeLodgingItem(costDeleteTarget.id);
                  }
                  setCostDeleteTarget(null);
                }}
                className="rounded-xl bg-[#F04452] px-4 py-3 text-[14px] font-bold text-white hover:bg-[#D93A47]"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setCostDeleteTarget(null)}
                className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] hover:bg-[#E5E8EB]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {copyPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[80vh] w-full max-w-[440px] flex-col rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-[#191F28]">
              다른 참여자에서 불러오기
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-[#8B95A1]">
              같은 출장에서 이미 작성된 참여자를 선택합니다. 불러오면 현재
              입력값이 덮어씌워집니다.
            </p>

            <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border border-[#E5E8EB] p-2">
              {copySources.map((source) => {
                const selected = source.id === copySourceId;
                return (
                  <label
                    key={source.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      selected ? "bg-[#F2F8FF]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="copy-source"
                      checked={selected}
                      onChange={() => setCopySourceId(source.id)}
                      className="h-4 w-4 accent-[#3182F6]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <PersonNameLabel
                          name={source.name}
                          resigned={
                            !!source.personId &&
                            isResignedPerson(
                              directoryPeople.find(
                                (person) => person.id === source.personId,
                              ),
                            )
                          }
                          className="text-[14px] font-semibold text-[#191F28]"
                        />
                        <StatusBadge status={source.status} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#8B95A1]">
                        {source.department}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="mt-3 rounded-xl bg-[#FFF8E8] px-3.5 py-2.5 text-[12px] leading-5 text-[#8A6116]">
              지역·일정·근무시간·사업추진비·교통비·숙박비를 덮어씁니다. 이름과
              정산 대상은 그대로입니다.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!selectedCopySource}
                onClick={() => {
                  if (!selectedCopySource) return;
                  onChange(
                    cloneReportFormFrom(selectedCopySource, authorPersonId),
                  );
                  setCopyPickerOpen(false);
                  setCopySourceId(null);
                }}
                className="rounded-xl bg-[#3182F6] px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#1B64DA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopyPickerOpen(false);
                  setCopySourceId(null);
                }}
                className="rounded-xl bg-[#F2F4F6] px-4 py-3 text-[14px] font-bold text-[#4E5968] transition-colors hover:bg-[#E5E8EB]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
