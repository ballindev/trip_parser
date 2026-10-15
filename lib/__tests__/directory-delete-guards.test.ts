import { describe, expect, it } from "vitest";
import {
  PERSON_DELETE_BLOCKED_MESSAGE,
  TEAM_DELETE_BLOCKED_MESSAGE,
  canHardDeleteByHistoryCount,
  classifyPeopleDelete,
  classifyTeamDelete,
  collectPersonIdsWithTripHistory,
} from "@/lib/directory-delete-guards";
import { makeParticipant, makeTrip } from "./fixtures";

describe("출장 이력 삭제 가드", () => {
  it("canHardDeleteByHistoryCount: 이력이 있으면 삭제 불가", () => {
    expect(canHardDeleteByHistoryCount(0)).toBe(true);
    expect(canHardDeleteByHistoryCount(1)).toBe(false);
    expect(canHardDeleteByHistoryCount(3)).toBe(false);
  });

  it("API 차단 메시지 상수", () => {
    expect(PERSON_DELETE_BLOCKED_MESSAGE).toContain("출장 이력");
    expect(PERSON_DELETE_BLOCKED_MESSAGE).toContain("퇴사");
    expect(TEAM_DELETE_BLOCKED_MESSAGE).toContain("팀원");
  });

  it("collectPersonIdsWithTripHistory: personId만 수집", () => {
    const trips = [
      makeTrip({
        participants: [
          makeParticipant({ personId: "p1" }),
          makeParticipant({ id: "part-2", personId: "p2", name: "이출장" }),
          makeParticipant({ id: "part-3", personId: undefined, name: "고아" }),
        ],
      }),
    ];
    const ids = collectPersonIdsWithTripHistory(trips);
    expect([...ids].sort()).toEqual(["p1", "p2"]);
  });

  it("인원 삭제: 전원 이력 있으면 blocked", () => {
    const history = new Set(["p1", "p2"]);
    expect(classifyPeopleDelete(["p1", "p2"], history)).toEqual({
      kind: "blocked",
      blockedIds: ["p1", "p2"],
    });
  });

  it("인원 삭제: 일부만 이력 있으면 이력 없는 인원만 allow", () => {
    const history = new Set(["p1"]);
    expect(classifyPeopleDelete(["p1", "p2", "p3"], history)).toEqual({
      kind: "allow",
      allowedIds: ["p2", "p3"],
    });
  });

  it("인원 삭제: 이력 없으면 전원 allow", () => {
    expect(classifyPeopleDelete(["p1"], new Set())).toEqual({
      kind: "allow",
      allowedIds: ["p1"],
    });
  });

  it("팀 삭제: 멤버 중 이력 1명이라도 있으면 blocked", () => {
    const history = new Set(["p2"]);
    expect(classifyTeamDelete(["p1", "p2"], history)).toEqual({
      kind: "blocked",
      blockedMemberIds: ["p2"],
    });
  });

  it("팀 삭제: 멤버 이력 없으면 allow", () => {
    expect(classifyTeamDelete(["p1", "p2"], new Set())).toEqual({
      kind: "allow",
    });
  });

  it("빈 팀(멤버 없음)은 allow", () => {
    expect(classifyTeamDelete([], new Set(["p1"]))).toEqual({ kind: "allow" });
  });
});
