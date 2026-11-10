/** 하루는 `당일`, 이틀 이상은 `N일간`. 기간을 셀 수 없으면 null입니다. */
export function tripDayCountLabel(days: number | null): string | null {
  if (days === null || days < 1) return null;
  return days === 1 ? "당일" : `${days}일간`;
}

/** 기간 뒤의 일수 표기. 앞에 가운데 점을 붙이고, 기간과 같은 글자를 씁니다. */
export function TripDayCount({ days }: { days: number | null }) {
  const label = tripDayCountLabel(days);
  if (!label) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
      <span aria-hidden="true">·</span>
      <span>{label}</span>
    </span>
  );
}
