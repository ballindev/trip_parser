import type { Trip } from "@/lib/types";

export const PERSON_DELETE_BLOCKED_MESSAGE =
  "출장 이력이 있는 인원은 삭제할 수 없습니다. 퇴사 처리해 주세요.";

export const TEAM_DELETE_BLOCKED_MESSAGE =
  "출장 이력이 있는 팀원이 있어 팀을 삭제할 수 없습니다.";

/** API: trip_participants count 기준 hard-delete 가능 여부 */
export function canHardDeleteByHistoryCount(count: number): boolean {
  return count <= 0;
}

/** 클라이언트: 출장 참가 personId 집합 */
export function collectPersonIdsWithTripHistory(
  trips: Pick<Trip, "participants">[],
): Set<string> {
  const ids = new Set<string>();
  for (const trip of trips) {
    for (const participant of trip.participants) {
      if (participant.personId) ids.add(participant.personId);
    }
  }
  return ids;
}

export type PeopleDeleteClassification =
  | { kind: "blocked"; blockedIds: string[] }
  | { kind: "allow"; allowedIds: string[] };

/**
 * 인원 삭제 요청 분류.
 * - 전원 이력 있음 → blocked (삭제 불가 안내)
 * - 일부만 이력 있음 → 이력 없는 인원만 allow (이력 있는 인원은 제외)
 * - 전원 이력 없음 → allow
 */
export function classifyPeopleDelete(
  ids: string[],
  personIdsWithTripHistory: Set<string>,
): PeopleDeleteClassification {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const blockedIds = uniqueIds.filter((id) =>
    personIdsWithTripHistory.has(id),
  );
  const allowedIds = uniqueIds.filter(
    (id) => !personIdsWithTripHistory.has(id),
  );

  if (blockedIds.length > 0 && allowedIds.length === 0) {
    return { kind: "blocked", blockedIds };
  }
  return { kind: "allow", allowedIds };
}

export type TeamDeleteClassification =
  | { kind: "blocked"; blockedMemberIds: string[] }
  | { kind: "allow" };

/** 팀 삭제: 멤버 중 출장 이력이 한 명이라도 있으면 blocked */
export function classifyTeamDelete(
  memberIds: string[],
  personIdsWithTripHistory: Set<string>,
): TeamDeleteClassification {
  const blockedMemberIds = memberIds.filter((id) =>
    personIdsWithTripHistory.has(id),
  );
  if (blockedMemberIds.length > 0) {
    return { kind: "blocked", blockedMemberIds };
  }
  return { kind: "allow" };
}
