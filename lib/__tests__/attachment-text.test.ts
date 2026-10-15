import { describe, expect, it } from "vitest";
import {
  buildAttachmentText,
  formatTitledList,
} from "@/lib/attachment-text";
import { makeForm, makeParticipant, makeTrip } from "./fixtures";

describe("formatTitledList", () => {
  it("항목 1개면 '제목: 내용' 형식", () => {
    expect(formatTitledList("일비", ["25,000 원 × 1명 × 1일 = 25,000 원 (김출장)"])).toBe(
      "일비: 25,000 원 × 1명 × 1일 = 25,000 원 (김출장)",
    );
  });

  it("항목 2개 이상이면 제목 + 가/나 목록", () => {
    expect(formatTitledList("숙박비", ["A", "B"])).toBe(
      ["숙박비", "  가. A", "  나. B"].join("\n"),
    );
  });

  it("빈 목록은 빈 문자열", () => {
    expect(formatTitledList("식비", [])).toBe("");
  });
});

describe("buildAttachmentText — 단일 항목 제목: 내용", () => {
  it("섹션별 항목이 1개면 번호 뒤에 '제목: 내용' 형식을 쓴다", () => {
    const trip = makeTrip({
      participants: [
        makeParticipant({
          form: makeForm({
            transportItems: [],
          }),
        }),
      ],
    });

    const text = buildAttachmentText(trip);
    expect(text).toMatch(/\d+\. 일비:/);
    expect(text).toMatch(/\d+\. 식비:/);
    expect(text).toMatch(/\d+\. 숙박비:/);
    expect(text).toMatch(/\d+\. 계정과목: 출장비/);
    // 항목 1개일 때는 가/나 목록이 아니라 콜론 한 줄
    expect(text).not.toMatch(/\d+\. 일비\n/);
    expect(text).not.toContain("  가. ");
  });

  it("교통비 수단·항목이 각 1개면 '교통비: 수단 내용' 형식", () => {
    const trip = makeTrip({
      participants: [
        makeParticipant({
          form: makeForm({
            dailyMeals: [
              {
                date: "2026-03-10",
                breakfast: false,
                lunch: false,
                dinner: false,
              },
            ],
            lodgingItems: [],
          }),
        }),
      ],
      summary: "",
    });

    const text = buildAttachmentText(trip);
    expect(text).toMatch(/교통비: 대중교통 /);
    expect(text).not.toContain("  가. 대중교통");
  });
});
