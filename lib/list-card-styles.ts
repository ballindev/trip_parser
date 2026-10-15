/** 출장·참여자·팀·인원 리스트 카드의 공통 선택/미선택 스타일 */

export const LIST_CARD_SELECTED =
  "border-edge-strong bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(25,31,40,0.12),0_2px_6px_rgba(25,31,40,0.10)]";

export const LIST_CARD_IDLE =
  "border-transparent bg-surface-muted hover:bg-surface-muted-hover";

export const LIST_CARD_DRAGGING =
  "z-10 border-dashed border-edge-drag bg-surface-muted opacity-40";

export function listCardClassName({
  selected,
  isDragging = false,
  withGroup = true,
  withTransition = false,
}: {
  selected: boolean;
  isDragging?: boolean;
  withGroup?: boolean;
  withTransition?: boolean;
}): string {
  const base = [
    withGroup ? "group" : null,
    "relative overflow-hidden rounded-xl border",
    withTransition ? "transition-all" : null,
  ]
    .filter(Boolean)
    .join(" ");

  if (isDragging) return `${base} ${LIST_CARD_DRAGGING}`;
  if (selected) return `${base} ${LIST_CARD_SELECTED}`;
  return `${base} ${LIST_CARD_IDLE}`;
}
