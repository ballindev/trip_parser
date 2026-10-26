import { formatDotDate, isIsoDate } from "@/lib/change-requests";

export type ChangelogItem = {
  id: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** 글 전체. 줄바꿈은 안내 화면에서 항목으로 나뉩니다. */
  body: string;
  createdAt?: string;
};

export type ChangelogEntry = {
  id: string;
  /** `YYYY.MM.DD` */
  date: string;
  lines: string[];
};

export function latestChangelogDate(items: ChangelogItem[]): string {
  const latest = items.reduce(
    (max, item) => (item.date > max ? item.date : max),
    "",
  );
  return latest ? formatDotDate(latest) : "";
}

export function changelogLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function toChangelogEntries(items: ChangelogItem[]): ChangelogEntry[] {
  return items
    .slice()
    .sort((left, right) => {
      if (left.date !== right.date) return right.date.localeCompare(left.date);
      return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
    })
    .map((item) => ({
      id: item.id,
      date: formatDotDate(item.date),
      lines: changelogLines(item.body),
    }));
}

export function parseChangelogInput(body: { date?: string; body?: string }):
  | { date: string; body: string }
  | { error: string } {
  const date = body.date ?? "";
  const text = body.body?.trim() ?? "";
  if (!isIsoDate(date)) return { error: "날짜를 선택해 주세요." };
  if (!text) return { error: "내용을 입력해 주세요." };
  if (text.length > 4000) return { error: "내용은 4000자까지 입력할 수 있습니다." };
  return { date, body: text };
}
