import { isLocalRegion } from "@/lib/regions";
import {
  createCostItemId,
  withTransportPeople,
} from "@/lib/transport-cost";
import type { Participant, ReportForm } from "@/lib/types";

/** 관내(서울)에서 미지원인 식비·교통·숙박 입력을 비웁니다. */
export function clearLocalUnsupportedCosts(form: ReportForm): ReportForm {
  return {
    ...form,
    dailyMeals: (form.dailyMeals ?? []).map((meal) => ({
      ...meal,
      breakfast: false,
      lunch: false,
      dinner: false,
    })),
    transportItems: [],
    lodgingItems: [],
  };
}

/** 복사할 만한 입력(또는 작성 상태)이 있는지 */
export function isCopyableSource(participant: Participant): boolean {
  if (participant.status === "작성중" || participant.status === "완료") {
    return true;
  }
  const form = participant.form;
  if (!form) return false;
  if (form.region?.trim()) return true;
  if (form.startDate || form.endDate) return true;
  if ((form.dailyHours ?? []).some((day) => day.startTime || day.endTime)) {
    return true;
  }
  if ((form.dailyMeals ?? []).some((meal) => meal.breakfast || meal.lunch || meal.dinner)) {
    return true;
  }
  if ((form.transportItems ?? []).length > 0) return true;
  if ((form.lodgingItems ?? []).length > 0) return true;
  return false;
}

/**
 * 다른 참여자 폼을 복제합니다.
 * - 교통/숙박 행 id는 새로 발급
 * - 렌트 탑승 인원의 작성자 personId는 대상 작성자로 치환
 * - 관내 지역이면 미지원 항목은 비움
 */
export function cloneReportFormFrom(
  source: Participant,
  targetAuthorPersonId: string | null,
): ReportForm {
  const sourceAuthorId = source.personId ?? null;
  const sourceForm = source.form;

  const transportItems = (sourceForm.transportItems ?? []).map((item) => {
    if (item.mode !== "렌트") {
      return {
        ...item,
        id: createCostItemId(),
        personIds: [] as string[],
      };
    }

    let personIds = [...(item.personIds ?? [])];
    if (sourceAuthorId && targetAuthorPersonId) {
      personIds = personIds.map((id) =>
        id === sourceAuthorId ? targetAuthorPersonId : id,
      );
    }
    if (targetAuthorPersonId && !personIds.includes(targetAuthorPersonId)) {
      personIds = [targetAuthorPersonId, ...personIds];
    }

    return withTransportPeople(
      { ...item, id: createCostItemId(), mode: "렌트" },
      personIds,
      targetAuthorPersonId ? 0 : 1,
    );
  });

  const lodgingItems = (sourceForm.lodgingItems ?? []).map((item) => ({
    id: createCostItemId(),
    amount: item.amount,
    people: 1 as const,
    times: item.times,
  }));

  const cloned: ReportForm = {
    region: sourceForm.region ?? "",
    startDate: sourceForm.startDate ?? "",
    endDate: sourceForm.endDate ?? "",
    dailyHours: (sourceForm.dailyHours ?? []).map((day) => ({ ...day })),
    dailyMeals: (sourceForm.dailyMeals ?? []).map((meal) => ({ ...meal })),
    transportItems,
    lodgingItems,
  };

  if (isLocalRegion(cloned.region)) {
    return clearLocalUnsupportedCosts(cloned);
  }
  return cloned;
}
