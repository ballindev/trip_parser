type PersonNameLabelProps = {
  name: string;
  resigned?: boolean;
  className?: string;
};

/** 이름 + 퇴사 표시 */
export function PersonNameLabel({
  name,
  resigned = false,
  className = "",
}: PersonNameLabelProps) {
  return (
    <span className={className}>
      {name}
      {resigned ? (
        <span className="ml-1 text-[11px] font-medium text-danger">
          (퇴사)
        </span>
      ) : null}
    </span>
  );
}

export function isResignedPerson(person?: {
  employmentStatus?: string;
} | null): boolean {
  return person?.employmentStatus === "퇴사";
}
