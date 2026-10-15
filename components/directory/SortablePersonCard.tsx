"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isResignedPerson } from "@/components/PersonNameLabel";
import { RowEditButton } from "@/components/RowActionIcons";
import { listCardClassName } from "@/lib/list-card-styles";
import type { Person } from "@/lib/types";

export function SortablePersonCard({
  person,
  selected,
  disabled,
  onSelect,
  onEdit,
}: {
  person: Person;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.id, disabled });
  const resigned = isResignedPerson(person);

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
        className={`flex w-full items-center gap-2 px-4 py-3 text-left ${
          disabled
            ? "cursor-pointer"
            : "cursor-grab touch-none active:cursor-grabbing"
        }`}
        {...attributes}
        {...(disabled ? {} : listeners)}
      >
        <p className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate text-[14px] font-bold text-ink">
            {person.name}
          </span>
          {person.rank ? (
            <span className="shrink-0 text-[13px] font-bold text-ink">
              {person.rank}
            </span>
          ) : null}
        </p>
        <div
          className={`relative flex w-[52px] shrink-0 items-center justify-end ${
            isDragging ? "" : "group-hover:pointer-events-none"
          }`}
        >
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-opacity ${
              isDragging ? "" : "group-hover:opacity-0"
            } ${
              resigned
                ? "bg-danger-soft text-danger"
                : "bg-surface-muted text-ink-subtle"
            }`}
          >
            {resigned ? "퇴사" : "재직"}
          </span>
        </div>
      </button>
      {!isDragging ? (
        <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <RowEditButton label="인원 수정" onClick={onEdit} />
        </div>
      ) : null}
    </div>
  );
}
