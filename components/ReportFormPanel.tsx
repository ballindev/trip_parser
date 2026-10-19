"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import { StatusBadge } from "@/components/StatusBadge";
import { rebuildDailyHours } from "@/lib/daily-hours";
import { eligibleMeals, rebuildDailyMeals } from "@/lib/daily-meals";
import { formatDateRange } from "@/lib/format";
import { isLocalRegion, normalizeRegion } from "@/lib/regions";
import {
  clearLocalUnsupportedCosts,
  cloneReportFormFrom,
  isCopyableSource,
} from "@/lib/report-form-copy";
import { getMissingRequiredLabels } from "@/lib/report-validation";
import { withTransportPeople } from "@/lib/transport-cost";
import type {
  LodgingCostItem,
  Participant,
  Person,
  ReportForm,
  TransportCostItem,
} from "@/lib/types";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";
import { useSmoothStickySummary } from "@/lib/use-smooth-sticky-summary";
import { uiPanel, uiPanelHeader, uiRowClassName } from "@/lib/ui-tokens";
import {
  CostSections,
  MEAL_OPTIONS,
  ensureTransportPersonIds,
  isCostLineFilled,
  isLodgingLineFilled,
  resolveAuthorPersonId,
} from "./report-form/CostSections";
import { DailyHoursSection } from "./report-form/DailyHoursSection";
import { RegionSection } from "./report-form/RegionSection";
import { ReportInputSummary } from "./report-form/ReportInputSummary";
import { ScheduleSection } from "./report-form/ScheduleSection";

type ReportFormPanelProps = {
  participant: Participant | null;
  form: ReportForm | null;
  directoryPeople?: Person[];
  /** 같은 출장의 다른 참여자 포함(렌트 일비 반액 판정용) */
  tripParticipants?: Participant[];
  tripName?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  saving?: boolean;
  onChange: (next: ReportForm) => void;
  onDraftSave: () => void;
  onSubmit: () => void;
};

export function ReportFormPanel({
  participant,
  form,
  directoryPeople = [],
  tripParticipants = [],
  tripName = "",
  tripStartDate = "",
  tripEndDate = "",
  saving = false,
  onChange,
  onDraftSave,
  onSubmit,
}: ReportFormPanelProps) {
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

  const formScrollRef = useRef<HTMLDivElement>(null);
  const summaryAsideRef = useRef<HTMLElement>(null);

  useSmoothStickySummary(formScrollRef, summaryAsideRef, {
    enabled: Boolean(participant && form),
    baseOffset: tripName ? 60 : 0,
  });

  if (!participant || !form) {
    return (
      <section
        className={`flex h-full w-[70%] flex-1 flex-col overflow-hidden ${uiPanel}`}
      >
        <header className={`flex h-[56px] shrink-0 items-center ${uiPanelHeader} px-4`}>
          <h2 className="text-[15px] font-bold tracking-tight text-ink">
            출장비 데이터 입력폼
          </h2>
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="px-4 text-center">
            <p className="text-[15px] font-bold text-ink">
              참여자를 선택해 주세요
            </p>
            <p className="mt-2 text-[13px] text-ink-subtle">
              좌측에서 출장과 인원을 선택하면 복명서 입력폼이 표시됩니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const localUnsupported = isLocalRegion(form.region ?? "");
  const transportItems = localUnsupported ? [] : (form.transportItems ?? []);
  const lodgingItems = localUnsupported ? [] : (form.lodgingItems ?? []);
  const missingRequiredLabels = getMissingRequiredLabels(form);
  const canSubmit = missingRequiredLabels.length === 0;

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
    <section
      className={`flex h-full w-[70%] flex-1 flex-col overflow-hidden ${uiPanel}`}
    >
      <header
        className={`flex h-[56px] shrink-0 items-center justify-between gap-3 ${uiPanelHeader} px-4`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[15px] font-bold tracking-tight text-ink">
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
          {participant.department ? (
            <span className="shrink-0 truncate text-[13px] font-medium text-ink-subtle">
              {participant.department}
            </span>
          ) : null}
          <StatusBadge status={participant.status} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
            className="rounded-xl border border-edge bg-surface px-3 py-1.5 text-[13px] font-bold text-ink-subtle transition-colors hover:border-accent hover:bg-selected hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge disabled:hover:bg-surface disabled:hover:text-ink-subtle"
          >
            불러오기
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onDraftSave}
            className="rounded-xl bg-surface-muted px-3 py-1.5 text-[13px] font-bold text-ink-subtle transition-colors hover:bg-edge disabled:cursor-not-allowed disabled:opacity-40"
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
            className="rounded-xl bg-accent px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-edge-drag disabled:hover:bg-edge-drag"
          >
            제출
          </button>
        </div>
      </header>

      {!canSubmit && missingRequiredLabels.length > 0 ? (
        <div className="shrink-0 border-b border-warning-edge bg-warning-soft px-4 py-2 xl:hidden">
          <p className="text-[12px] font-semibold text-warning-ink-emphasis">
            제출 전 미입력
          </p>
          <p className="mt-0.5 text-[12px] font-medium leading-5 text-warning-ink-strong">
            {missingRequiredLabels.join(" · ")}
          </p>
        </div>
      ) : null}

      <div
        ref={formScrollRef}
        className="flex-1 overflow-y-auto px-5 pb-4 pt-0"
      >
        <div className="mr-auto flex w-full max-w-[1180px] items-start gap-6">
          <div className="min-w-0 flex-1">
            {tripName ? (
              <div className="flex h-[60px] items-center gap-2.5 border-b border-edge">
                <span
                  aria-hidden="true"
                  className="h-5 w-1 shrink-0 rounded-full bg-accent"
                />
                <h3 className="min-w-0 truncate text-[16px] font-bold tracking-tight text-ink">
                  {tripName}
                </h3>
                {(form.startDate && form.endDate) ||
                (tripStartDate && tripEndDate) ? (
                  <p className="shrink-0 text-[12px] font-medium text-ink-subtle">
                    {formatDateRange(
                      form.startDate || tripStartDate,
                      form.endDate || tripEndDate,
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
            <RegionSection form={form} onChange={onChange} />
            <ScheduleSection form={form} onChange={onChange} />
            <DailyHoursSection form={form} onChange={onChange} />
            <CostSections
              form={form}
              onChange={onChange}
              localUnsupported={localUnsupported}
              participant={participant}
              directoryPeople={directoryPeople}
              authorPersonId={authorPersonId}
              onRequestRemoveTransport={requestRemoveTransportItem}
              onRequestRemoveLodging={requestRemoveLodgingItem}
            />
          </div>

          <aside
            ref={summaryAsideRef}
            className={`hidden w-[260px] shrink-0 self-start will-change-transform xl:block ${
              tripName ? "mt-[60px]" : ""
            }`}
          >
            <ReportInputSummary
              participant={participant}
              form={form}
              directoryPeople={directoryPeople}
              tripParticipants={tripParticipants}
            />
          </aside>
        </div>
      </div>

      {costDeleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-ink">
              {costDeleteTarget.type === "transport"
                ? "교통비 항목을 삭제할까요?"
                : "숙박비 항목을 삭제할까요?"}
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-ink-subtle">
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
                className="rounded-xl bg-danger px-4 py-3 text-[14px] font-bold text-white hover:bg-danger-hover"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => setCostDeleteTarget(null)}
                className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-subtle hover:bg-edge"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {copyPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[80vh] w-full max-w-[440px] flex-col rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
            <h3 className="text-[17px] font-bold text-ink">
              다른 참여자에서 불러오기
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-ink-subtle">
              같은 출장에서 이미 작성된 참여자를 선택합니다. 불러오면 현재
              입력값이 덮어씌워집니다.
            </p>

            <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl border border-edge p-2">
              {copySources.map((source) => {
                const selected = source.id === copySourceId;
                return (
                  <label
                    key={source.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      uiRowClassName(selected)
                    }`}
                  >
                    <input
                      type="radio"
                      name="copy-source"
                      checked={selected}
                      onChange={() => setCopySourceId(source.id)}
                      className="h-4 w-4 accent-accent"
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
                          className="text-[14px] font-semibold text-ink"
                        />
                        <StatusBadge status={source.status} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-subtle">
                        {source.department}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="mt-3 rounded-xl bg-warning-banner px-3.5 py-2.5 text-[12px] leading-5 text-warning-ink">
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
                className="rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopyPickerOpen(false);
                  setCopySourceId(null);
                }}
                className="rounded-xl bg-surface-muted px-4 py-3 text-[14px] font-bold text-ink-subtle transition-colors hover:bg-edge"
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
