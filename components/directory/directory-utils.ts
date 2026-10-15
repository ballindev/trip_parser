import { arrayMove } from "@dnd-kit/sortable";
import { isResignedPerson } from "@/components/PersonNameLabel";
import type { Person, Team } from "@/lib/types";

/** visible 목록 안에서 순서를 바꾼 뒤, 숨겨진 id는 원래 자리에 유지합니다. */
export function reorderVisibleWithinFull(
  fullIds: string[],
  visibleIds: string[],
  activeId: string,
  overId: string,
): string[] {
  const oldIndex = visibleIds.indexOf(activeId);
  const newIndex = visibleIds.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return fullIds;
  const nextVisible = arrayMove(visibleIds, oldIndex, newIndex);
  let cursor = 0;
  return fullIds.map((id) =>
    visibleIds.includes(id) ? nextVisible[cursor++]! : id,
  );
}

export function resolvePersonTeamId(personId: string, teams: Team[]): string {
  return teams.find((team) => team.memberIds.includes(personId))?.id ?? "";
}

export function countActiveMembers(
  memberIds: string[],
  peopleById: Map<string, Person>,
): number {
  return memberIds.filter((id) => {
    const person = peopleById.get(id);
    return Boolean(person) && !isResignedPerson(person);
  }).length;
}
