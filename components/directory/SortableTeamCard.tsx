"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  RowDeleteButton,
  RowEditButton,
} from "@/components/RowActionIcons";
import { listCardClassName } from "@/lib/list-card-styles";
import type { Team } from "@/lib/types";

function TeamRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <RowEditButton label="팀 수정" onClick={onEdit} />
      <RowDeleteButton label="팀 삭제" onClick={onDelete} />
    </div>
  );
}

export function SortableTeamCard({
  team,
  selected,
  memberCount,
  disabled,
  onSelect,
  onEdit,
  onDelete,
}: {
  team: Team;
  selected: boolean;
  memberCount: number;
  disabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={listCardClassName({ selected, isDragging })}
    >
      {selected && !isDragging ? (
        <span
          aria-hidden="true"
          className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-accent"
        />
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onEdit}
        className={`w-full py-3 pr-16 pl-3 text-left ${
          disabled
            ? "cursor-pointer"
            : "cursor-grab touch-none active:cursor-grabbing"
        }`}
        {...attributes}
        {...(disabled ? {} : listeners)}
      >
        <p className="truncate text-[14px] font-bold text-ink">
          {team.name}{" "}
          <span className="font-medium text-ink-subtle">({memberCount}명)</span>
        </p>
      </button>
      {!isDragging ? (
        <TeamRowActions onEdit={onEdit} onDelete={onDelete} />
      ) : null}
    </div>
  );
}
