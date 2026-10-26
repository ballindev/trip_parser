const SEEN_KEY = "trip-parser-seen-changelog";

export function readSeenChangelogDate(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SEEN_KEY) ?? "";
}

export function writeSeenChangelogDate(date: string) {
  window.localStorage.setItem(SEEN_KEY, date);
}

export function hasUnseenChangelog(
  latestDate: string,
  seenDate = readSeenChangelogDate(),
): boolean {
  return Boolean(latestDate) && seenDate < latestDate;
}
