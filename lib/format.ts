const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** ISO `YYYY-MM-DD` → 표시용 `YYYY.MM.DD` */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${year}.${month}.${day}`;
}

/** ISO 날짜의 한글 요일. 잘못된 날짜면 빈 문자열입니다. */
export function formatWeekday(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }
  return WEEKDAY_LABELS[date.getDay()];
}

function withWeekday(label: string, isoDate: string): string {
  const weekday = formatWeekday(isoDate);
  if (!label || !weekday) return label;
  return `${label} (${weekday})`;
}

/** `2026.11.05 (수)` */
export function formatDisplayDateWithWeekday(isoDate: string): string {
  return withWeekday(formatDisplayDate(isoDate), isoDate);
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

/** 기간의 시작·종료 날짜 모두에 요일을 붙입니다. */
export function formatDateRangeWithWeekday(
  startDate: string,
  endDate: string,
): string {
  const start = formatDisplayDateWithWeekday(startDate);
  if (!start) return "";

  if (!endDate || startDate.slice(0, 10) === endDate.slice(0, 10)) return start;

  const [startYear] = startDate.split("-");
  const [endYear, endMonth, endDay] = endDate.split("-");

  if (startYear === endYear) {
    return `${start} – ${withWeekday(`${endMonth}.${endDay}`, endDate)}`;
  }

  return `${start} – ${formatDisplayDateWithWeekday(endDate)}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function participationBadge(completed: number, total: number): string {
  return `${completed}/${total}명 작성`;
}
