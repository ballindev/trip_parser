"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import { SelectDropdown } from "@/components/SelectDropdown";
import { eligibleMeals } from "@/lib/daily-meals";
import { formatCurrency, formatDisplayDate } from "@/lib/format";
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
  Participant,
  Person,
  ReportForm,
  TransportCostItem,
  TransportMode,
} from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";
import { uiFocusRing, uiRowClassName } from "@/lib/ui-tokens";
import { FormSection } from "./FormSection";

export const MEAL_OPTIONS: {
  key: keyof Pick<DailyMeal, "breakfast" | "lunch" | "dinner">;
  label: string;
}[] = [
  { key: "breakfast", label: "조식" },
  { key: "lunch", label: "중식" },
  { key: "dinner", label: "석식" },
];

export function parseDigitsOnly(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const next = Number(digits);
  if (!Number.isFinite(next) || next < 0) return 0;
  return Math.floor(next);
}

export function formatAmountInput(value: number): string {
  if (!value) return "";
  return formatCurrency(value);
}

export const numberInputClassName =
  `h-9 w-full rounded-lg border border-edge bg-surface px-2 text-right text-[13px] tabular-nums text-ink ${uiFocusRing} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

/** 교통비/숙박비 공통 고정 그리드: 수단 | 금액+원 | × | 인원+인(+배지) | × | 회수/일수 | = | 총합 | 삭제 */
export const costRowGridClassName =
  "grid w-full grid-cols-[104px_112px_12px_108px_12px_64px_12px_100px_28px] items-center gap-x-1.5 overflow-visible rounded-2xl bg-surface-subtle px-2.5 py-2";

export function isCostLineFilled(
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

export function CostLineRow({
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
    <div className="space-y-2 rounded-2xl bg-surface-subtle px-2.5 py-2">
      <div className={`${costRowGridClassName} !rounded-none !bg-transparent !p-0`}>
        <div className="min-w-0">{modeSlot ?? null}</div>

        <div className="flex min-w-0 items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            aria-label="금액"
            placeholder={amountPlaceholder}
            className={`${numberInputClassName} placeholder:text-[11px] placeholder:font-medium placeholder:text-edge-drag`}
            value={formatAmountInput(amount)}
            onChange={(e) =>
              onChange({ amount: parseDigitsOnly(e.target.value) })
            }
          />
          <span className="shrink-0 text-[12px] font-semibold text-ink-subtle">
            원
          </span>
        </div>

        <span className="text-center text-[13px] font-semibold text-ink-subtle">
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
                  ? "cursor-not-allowed border-dashed bg-surface-inset text-ink-subtle"
                  : ""
              }`}
              value={people || ""}
              onChange={(e) => {
                if (peopleReadOnly) return;
                onChange({ people: parseDigitsOnly(e.target.value) });
              }}
            />
          </div>
          <span className="shrink-0 text-[12px] font-semibold text-ink-subtle">
            인
          </span>
          {peopleReadOnly && peopleBadge ? (
            <span className="shrink-0 rounded-md bg-edge px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-ink-subtle">
              {peopleBadge}
            </span>
          ) : null}
        </div>

        <span className="text-center text-[13px] font-semibold text-ink-subtle">
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
          <span className="shrink-0 text-[12px] font-semibold text-ink-subtle">
            {timesUnit}
          </span>
        </div>

        <span className="text-center text-[13px] font-semibold text-ink-subtle">
          =
        </span>

        <div className="flex h-9 w-full items-center justify-end rounded-lg bg-selected px-2.5">
          <p className="truncate text-right text-[12px] font-bold tabular-nums text-accent">
            {formatCurrency(rowTotal)}원
          </p>
        </div>

        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center justify-self-end rounded-lg bg-edge text-[15px] font-bold leading-none text-ink-subtle transition-colors hover:bg-danger-soft-hover hover:text-danger"
        >
          −
        </button>
      </div>
      {footer}
    </div>
  );
}

export function resolveAuthorPersonId(
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

export function ensureTransportPersonIds(
  item: TransportCostItem,
  authorPersonId: string | null,
): string[] {
  return ensurePersonIds(item.personIds, authorPersonId);
}

export function selectedPeopleCount(
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
      <div className="rounded-xl border border-edge bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-ink-subtle">
            {label}
            <span className="ml-1 font-medium text-edge-drag">
              · 선택 시 인원 수 자동 반영
            </span>
          </p>
          <button
            type="button"
            onClick={openPicker}
            className="rounded-lg bg-selected px-2.5 py-1 text-[12px] font-bold text-accent transition-colors hover:bg-selected-hover"
          >
            + 인원 추가
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {!authorPersonId ? (
            <span className="inline-flex items-center rounded-full bg-surface-inset px-2.5 py-1 text-[12px] font-semibold text-ink-subtle">
              {authorName}
              <span className="ml-1 text-[11px] font-medium text-ink-subtle">
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
                    ? "bg-surface-inset text-ink-subtle"
                    : "bg-selected text-accent"
                }`}
              >
                <PersonNameLabel
                  name={person.name}
                  resigned={isResignedPerson(person)}
                />
                {isAuthor ? (
                  <span className="text-[11px] font-medium text-ink-subtle">
                    본인
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`${person.name} 제거`}
                    onClick={() => removePerson(person.id)}
                    className="ml-0.5 text-[14px] leading-none text-ink-subtle hover:text-danger"
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
          <div className="flex max-h-[80vh] w-full max-w-[440px] flex-col rounded-2xl bg-surface p-5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-ink">
              {pickerTitle}
            </h3>
            <p className="mt-1 text-[13px] text-ink-subtle">
              회사 인원에서 검색해 선택합니다. 작성자 본인은 기본 포함됩니다.
            </p>

            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 직급, 소속팀 검색"
              className="mt-4 h-11 w-full rounded-xl border border-edge bg-surface-subtle px-3.5 text-[14px] outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
            />

            <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border border-edge p-2">
              {filteredPeople.map((person) => {
                const isAuthor = person.id === authorPersonId;
                const checked = draftIds.includes(person.id) || isAuthor;
                return (
                  <label
                    key={person.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      uiRowClassName(checked)
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
                      className="h-4 w-4 accent-accent disabled:opacity-70"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-1.5 truncate text-[14px] font-bold text-ink">
                        <PersonNameLabel
                          name={person.name}
                          resigned={isResignedPerson(person)}
                          className="truncate"
                        />
                        {person.rank ? (
                          <span className="shrink-0 text-[13px] font-medium text-ink-subtle">
                            {person.rank}
                          </span>
                        ) : null}
                        {isAuthor ? (
                          <span className="shrink-0 text-[12px] font-medium text-ink-subtle">
                            (본인)
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-subtle">
                        {person.department}
                      </span>
                    </span>
                  </label>
                );
              })}
              {filteredPeople.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-ink-subtle">
                  검색 결과가 없습니다
                </p>
              ) : null}
            </div>

            <p className="mt-3 text-[12px] font-semibold text-ink-subtle">
              선택{" "}
              <span className="text-accent">
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
                className="rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white hover:bg-accent-hover"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-subtle hover:bg-edge"
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

export function isLodgingLineFilled(item: LodgingCostItem): boolean {
  return item.amount > 0 || item.times > 0;
}

type CostSectionsProps = {
  form: ReportForm;
  onChange: (next: ReportForm) => void;
  localUnsupported: boolean;
  participant: Participant;
  directoryPeople: Person[];
  authorPersonId: string | null;
  onRequestRemoveTransport: (item: TransportCostItem) => void;
  onRequestRemoveLodging: (item: LodgingCostItem) => void;
};

export function CostSections({
  form,
  onChange,
  localUnsupported,
  participant,
  directoryPeople,
  authorPersonId,
  onRequestRemoveTransport,
  onRequestRemoveLodging,
}: CostSectionsProps) {
  const transportItems = localUnsupported ? [] : (form.transportItems ?? []);
  const lodgingItems = localUnsupported ? [] : (form.lodgingItems ?? []);
  const transportTotal = sumCostLines(transportItems);
  const lodgingTotal = sumCostLines(lodgingItems);

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

  return (
    <>
      <FormSection
        title="※ 사업추진비 사용여부"
        description="근무시간에 포함되는 끼니만 선택할 수 있습니다. 선택한 끼니는 식비 지급에서 제외되고 붙임 자료에 사추비로 표기됩니다."
        disabled={localUnsupported}
        disabledMessage="관내(서울) 출장은 식비가 지원되지 않아 사업추진비를 입력하지 않습니다."
      >
        <details className="group mb-3 rounded-xl border border-edge bg-surface-subtle px-3.5 py-2.5 text-[12px] leading-5 text-ink-subtle open:pb-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-ink-subtle [&::-webkit-details-marker]:hidden">
            <span>선택 가능 기준 보기</span>
            <span className="text-[11px] font-medium text-ink-subtle group-open:hidden">
              펼치기
            </span>
            <span className="hidden text-[11px] font-medium text-ink-subtle group-open:inline">
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
          <div className="rounded-xl bg-surface-subtle px-4 py-8 text-center">
            <p className="text-[14px] font-semibold text-ink-subtle">
              표시할 날짜가 없습니다
            </p>
            <p className="mt-1 text-[12px] text-ink-subtle">
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
                  className="grid items-center gap-3 rounded-2xl bg-surface-subtle p-3 sm:grid-cols-[112px_minmax(0,1fr)]"
                >
                  <div
                    aria-readonly="true"
                    title="출장 일정에서 자동으로 채워진 날짜입니다"
                    className="flex h-11 select-none items-center justify-center rounded-xl bg-surface-inset px-3 text-center text-[13px] font-semibold tabular-nums text-ink-subtle"
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
                            className="h-4 w-4 accent-accent disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-[14px] font-semibold ${
                              enabled ? "text-ink-subtle" : "text-ink-subtle"
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
                onRemove={() => onRequestRemoveTransport(item)}
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
                      <p className="text-[12px] leading-5 text-ink-subtle">
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
            <div className="rounded-xl bg-surface-subtle px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-ink-subtle">
                등록된 교통비가 없습니다
              </p>
              <p className="mt-1 text-[12px] text-ink-subtle">
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-edge-strong bg-surface py-3 text-[13px] font-bold text-accent transition-colors hover:border-accent hover:bg-selected"
          >
            <span className="text-[16px] leading-none">+</span>
            교통비 추가
          </button>

          {transportItems.length > 0 ? (
            <div className="flex items-center justify-between rounded-xl bg-selected px-4 py-3">
              <span className="text-[13px] font-semibold text-accent">
                교통비 합계
              </span>
              <span className="text-right text-[15px] font-bold tabular-nums text-ink">
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
              onRemove={() => onRequestRemoveLodging(item)}
              removeLabel="숙박비 행 삭제"
            />
          ))}

          {lodgingItems.length === 0 ? (
            <div className="rounded-xl bg-surface-subtle px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-ink-subtle">
                등록된 숙박비가 없습니다
              </p>
              <p className="mt-1 text-[12px] text-ink-subtle">
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-edge-strong bg-surface py-3 text-[13px] font-bold text-accent transition-colors hover:border-accent hover:bg-selected"
          >
            <span className="text-[16px] leading-none">+</span>
            숙박비 추가
          </button>

          {lodgingItems.length > 0 ? (
            <div className="flex items-center justify-between rounded-xl bg-selected px-4 py-3">
              <span className="text-[13px] font-semibold text-accent">
                숙박비 합계
              </span>
              <span className="text-right text-[15px] font-bold tabular-nums text-ink">
                {formatCurrency(lodgingTotal)}원
              </span>
            </div>
          ) : null}
        </div>
      </FormSection>
    </>
  );
}
