/** ISO `YYYY-MM-DD` → 표시용 `YYYY.MM.DD` */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${year}.${month}.${day}`;
}

/** 표시용 `YYYY.MM.DD` (또는 `/`, `-` 구분) → ISO `YYYY-MM-DD` */
export function parseDisplayDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const matched = trimmed.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (!matched) return null;

  const year = matched[1];
  const month = matched[2].padStart(2, "0");
  const day = matched[3].padStart(2, "0");
  const iso = `${year}-${month}-${day}`;

  const date = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return iso;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = formatDisplayDate(startDate);
  if (!start) return "";

  if (!endDate || startDate === endDate) return start;

  const [startYear] = startDate.split("-");
  const [endYear, endMonth, endDay] = endDate.split("-");

  if (startYear === endYear) {
    return `${start} – ${endMonth}.${endDay}`;
  }

  return `${start} – ${formatDisplayDate(endDate)}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function participationBadge(completed: number, total: number): string {
  return `${completed}/${total}명 작성`;
}
