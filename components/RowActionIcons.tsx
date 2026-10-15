export function PencilIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.42 3.58a2.1 2.1 0 0 1 2.97 2.97L7.5 18.44 3 19.5l1.06-4.5Z" />
      <path d="m15 5 3.5 3.5" />
    </svg>
  );
}

export function TrashIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

const actionButtonClassName =
  "flex h-9 w-9 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-surface hover:text-accent";

const deleteButtonClassName =
  "flex h-9 w-9 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-surface hover:text-danger";

export function RowEditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={actionButtonClassName}
    >
      <PencilIcon />
    </button>
  );
}

export function RowDeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={deleteButtonClassName}
    >
      <TrashIcon />
    </button>
  );
}
