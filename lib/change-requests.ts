import type {
  ChangeRequest,
  ChangeRequestCategory,
  ChangeRequestStatus,
} from "@/lib/types";

export const CHANGE_REQUEST_CATEGORIES = ["오류", "개선"] as const;
export const CHANGE_REQUEST_STATUSES = [
  "접수",
  "진행 중",
  "반영됨",
  "보류",
] as const;

export type DbChangeRequest = {
  id: string;
  person_id: string | null;
  author_name: string;
  category: ChangeRequestCategory;
  body: string;
  status: ChangeRequestStatus;
  resolved_on: string | null;
  created_at: string;
};

export function mapChangeRequest(row: DbChangeRequest): ChangeRequest {
  return {
    id: row.id,
    personId: row.person_id,
    authorName: row.author_name,
    category: row.category,
    body: row.body,
    status: row.status,
    resolvedOn: row.resolved_on,
    createdAt: row.created_at,
  };
}

export function isChangeRequestCategory(
  value: string,
): value is ChangeRequestCategory {
  return (CHANGE_REQUEST_CATEGORIES as readonly string[]).includes(value);
}

export function isChangeRequestStatus(
  value: string,
): value is ChangeRequestStatus {
  return (CHANGE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` 또는 ISO 시각을 `YYYY.MM.DD`로 바꿉니다. */
export function formatDotDate(value: string): string {
  return value.slice(0, 10).replaceAll("-", ".");
}

export function parseStatusPatch(body: {
  status?: string;
  resolvedOn?: string | null;
}):
  | { status: ChangeRequestStatus; resolvedOn: string | null }
  | { error: string } {
  if (!body.status || !isChangeRequestStatus(body.status)) {
    return { error: "상태를 선택해 주세요." };
  }
  if (body.status !== "반영됨") {
    return { status: body.status, resolvedOn: null };
  }
  const resolvedOn = body.resolvedOn ?? "";
  if (!isIsoDate(resolvedOn)) {
    return { error: "반영된 날짜를 선택해 주세요." };
  }
  return { status: body.status, resolvedOn };
}

export function changeRequestDbError(message: string): string {
  if (message.includes("change_requests") || message.includes("schema cache")) {
    return "수정 요청 저장소가 아직 없습니다. Supabase SQL Editor에서 supabase/migrations/20261026010000_change_requests.sql 을 실행해 주세요.";
  }
  return message;
}
