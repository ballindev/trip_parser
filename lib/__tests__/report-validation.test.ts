import { describe, expect, it } from "vitest";
import { REGION_LOCAL } from "@/lib/regions";
import {
  getMissingRequiredLabels,
  isReportReadyToSubmit,
} from "@/lib/report-validation";
import { makeForm } from "./fixtures";

describe("getMissingRequiredLabels / isReportReadyToSubmit", () => {
  it("완전한 관외 양식은 제출 가능", () => {
    const form = makeForm();
    expect(getMissingRequiredLabels(form)).toEqual([]);
    expect(isReportReadyToSubmit(form)).toBe(true);
  });

  it("지역·일정이 비면 라벨을 반환하고 제출 불가", () => {
    const form = makeForm({
      region: "",
      startDate: "",
      endDate: "",
      dailyHours: [],
      transportItems: [],
      lodgingItems: [],
    });
    const missing = getMissingRequiredLabels(form);
    expect(missing).toContain("지역");
    expect(missing).toContain("출장 일정");
    expect(missing).toContain("날짜별 근무시간");
    expect(isReportReadyToSubmit(form)).toBe(false);
  });

  it("근무시간 미입력·잘못된 구간을 날짜별로 표시", () => {
    const form = makeForm({
      dailyHours: [
        {
          date: "2026-03-10",
          startTime: "",
          endTime: "",
          hours: 0,
          morningClaim: null,
        },
        {
          date: "2026-03-11",
          startTime: "18:00",
          endTime: "09:00",
          hours: 0,
          morningClaim: null,
        },
      ],
      endDate: "2026-03-11",
    });
    const missing = getMissingRequiredLabels(form);
    expect(missing.some((label) => label.startsWith("근무시간("))).toBe(true);
    expect(isReportReadyToSubmit(form)).toBe(false);
  });

  it("관내(서울)는 교통비·숙박비 검증을 생략", () => {
    const form = makeForm({
      region: REGION_LOCAL,
      transportItems: [],
      lodgingItems: [],
    });
    expect(getMissingRequiredLabels(form)).toEqual([]);
    expect(isReportReadyToSubmit(form)).toBe(true);
  });

  it("관외에서 불완전한 교통비·숙박비는 제출 불가", () => {
    const form = makeForm({
      transportItems: [
        {
          id: "t1",
          mode: "",
          amount: 5000,
          people: 1,
          times: 1,
          personIds: [],
        },
      ],
      lodgingItems: [
        { id: "l1", amount: 0, people: 1, times: 1 },
      ],
    });
    const missing = getMissingRequiredLabels(form);
    expect(missing).toContain("교통비 수단");
    expect(missing).toContain("숙박비(금액·일수)");
    expect(isReportReadyToSubmit(form)).toBe(false);
  });

  it("렌트는 personIds 인원 수와 people가 일치해야 제출 가능", () => {
    const incomplete = makeForm({
      transportItems: [
        {
          id: "t1",
          mode: "렌트",
          amount: 100_000,
          people: 2,
          times: 1,
          personIds: ["person-1"],
        },
      ],
    });
    expect(getMissingRequiredLabels(incomplete)).toContain("교통비 렌트 인원");
    expect(isReportReadyToSubmit(incomplete)).toBe(false);

    const complete = makeForm({
      transportItems: [
        {
          id: "t1",
          mode: "렌트",
          amount: 100_000,
          people: 2,
          times: 1,
          personIds: ["person-1", "person-2"],
        },
      ],
    });
    expect(getMissingRequiredLabels(complete)).not.toContain("교통비 렌트 인원");
    expect(isReportReadyToSubmit(complete)).toBe(true);
  });
});
