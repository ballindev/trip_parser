"use client";

import { useMemo } from "react";
import {
  PersonNameLabel,
  isResignedPerson,
} from "@/components/PersonNameLabel";
import {
  calcPersonAllowances,
  collectRentHalfPersonIds,
  isRentHalfParticipant,
} from "@/lib/attachment-text";
import { formatTotalWorkHours } from "@/lib/daily-hours";
import { formatMealSummary } from "@/lib/daily-meals";
import { formatCurrency, formatDateRange } from "@/lib/format";
import { isLocalRegion } from "@/lib/regions";
import { getMissingRequiredLabels } from "@/lib/report-validation";
import { sumCostLines } from "@/lib/transport-cost";
import type { Participant, Person, ReportForm } from "@/lib/types";
import { uiCard } from "@/lib/ui-tokens";
import { SummaryRow } from "./FormSection";

const LOCAL_UNSUPPORTED_LABEL = "관내 미지원";

type ReportInputSummaryProps = {
  participant: Participant;
  form: ReportForm;
  directoryPeople?: Person[];
  tripParticipants?: Participant[];
};

export function ReportInputSummary({
  participant,
  form,
  directoryPeople = [],
  tripParticipants = [],
}: ReportInputSummaryProps) {
  const rentHalfPersonIds = useMemo(() => {
    const liveParticipant = { ...participant, form };
    const others = tripParticipants.filter((row) => row.id !== participant.id);
    return collectRentHalfPersonIds([...others, liveParticipant]);
  }, [participant, form, tripParticipants]);

  const localUnsupported = isLocalRegion(form.region ?? "");
  const transportItems = localUnsupported ? [] : (form.transportItems ?? []);
  const lodgingItems = localUnsupported ? [] : (form.lodgingItems ?? []);
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
  const totalCost = dailyAllowance + mealPay + transportTotal + lodgingTotal;
  const missingRequiredLabels = getMissingRequiredLabels(form);

  return (
    <div className={`${uiCard} p-5`}>
      <p className="text-[13px] font-semibold text-ink-subtle">입력 요약</p>
      <h3 className="mt-1 text-[16px] font-bold text-ink">
        <PersonNameLabel
          name={participant.name}
          resigned={
            !!participant.personId &&
            isResignedPerson(
              directoryPeople.find((person) => person.id === participant.personId),
            )
          }
        />
      </h3>

      <div className="mt-4 divide-y divide-edge">
        <SummaryRow label="작성 상태" value={participant.status} />
        <SummaryRow label="지역" value={form.region || "미입력"} />
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
          value={formatTotalWorkHours(form.dailyHours)}
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
              ? LOCAL_UNSUPPORTED_LABEL
              : `${formatCurrency(mealPay)}원`
          }
        />
        <SummaryRow
          label="사업추진비"
          value={
            localUnsupported
              ? LOCAL_UNSUPPORTED_LABEL
              : formatMealSummary(form.dailyMeals)
          }
        />
        <SummaryRow
          label="교통비"
          value={
            localUnsupported
              ? LOCAL_UNSUPPORTED_LABEL
              : `${formatCurrency(transportTotal)}원`
          }
        />
        <SummaryRow
          label="숙박비"
          value={
            localUnsupported
              ? LOCAL_UNSUPPORTED_LABEL
              : `${formatCurrency(lodgingTotal)}원`
          }
        />
      </div>

      {missingRequiredLabels.length > 0 ? (
        <div className="mt-4 rounded-xl bg-warning-soft px-3.5 py-3">
          <p className="text-[12px] font-semibold text-warning-ink-emphasis">
            제출 전 미입력
          </p>
          <p className="mt-1 text-[12px] font-medium leading-5 text-warning-ink-strong">
            {missingRequiredLabels.join(" · ")}
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-selected px-3.5 py-3">
        <p className="text-[12px] font-semibold text-accent">비용 합계</p>
        <p className="mt-1 text-right text-[20px] font-bold tracking-tight tabular-nums text-ink">
          {formatCurrency(totalCost)}원
        </p>
      </div>
    </div>
  );
}
