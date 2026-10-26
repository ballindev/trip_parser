"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { toChangelogEntries } from "@/lib/changelog";
import {
  CHANGE_REQUEST_STATUSES,
  formatDotDate,
  todayIsoDate,
} from "@/lib/change-requests";
import type { ChangeRequest, ChangeRequestStatus } from "@/lib/types";
import { uiBtnDanger, uiBtnGhost, uiCard } from "@/lib/ui-tokens";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

type StatusFilter = "all" | ChangeRequestStatus;

const STATUS_CLASS: Record<ChangeRequestStatus, string> = {
  접수: "bg-surface-muted text-ink-secondary",
  "진행 중": "bg-selected-hover text-accent",
  반영됨: "bg-success-soft text-success",
  보류: "bg-warning-soft text-warning-ink",
};

const STATUS_RANK: Record<ChangeRequestStatus, number> = {
  접수: 0,
  "진행 중": 1,
  보류: 2,
  반영됨: 3,
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDotDate(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

export function DevRequestBoard() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [savingId, setSavingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChangeRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [changelogDates, setChangelogDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    api
      .getChangeRequests()
      .then((rows) => {
        if (!cancelled) setRequests(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "수정 요청을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getChangelog()
      .then((items) => {
        if (!cancelled) {
          setChangelogDates(
            new Set(toChangelogEntries(items).map((entry) => entry.date)),
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const next = {
      all: requests.length,
      접수: 0,
      "진행 중": 0,
      반영됨: 0,
      보류: 0,
    } satisfies Record<StatusFilter, number>;
    for (const request of requests) next[request.status] += 1;
    return next;
  }, [requests]);

  const visible = useMemo(() => {
    return requests
      .filter((request) => filter === "all" || request.status === filter)
      .slice()
      .sort((left, right) => {
        const rank = STATUS_RANK[left.status] - STATUS_RANK[right.status];
        if (rank !== 0) return rank;
        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [requests, filter]);

  const updateRequest = async (
    request: ChangeRequest,
    status: ChangeRequestStatus,
    resolvedOn: string | null,
  ) => {
    setSavingId(request.id);
    setError("");
    try {
      const next = await api.updateChangeRequest(request.id, {
        status,
        resolvedOn,
      });
      setRequests((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태를 바꾸지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteChangeRequest(deleteTarget.id);
      setRequests((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  useDialogKeyboard({
    enabled: deleteTarget !== null,
    confirmDisabled: deleting,
    onConfirm: () => void handleConfirmDelete(),
    onCancel: () => {
      if (!deleting) setDeleteTarget(null);
    },
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <div className="mx-auto flex w-full max-w-[840px] flex-col gap-4">
        <p className="text-[13px] font-semibold text-ink-subtle">
          접수 {counts.접수}건 · 진행 중 {counts["진행 중"]}건
        </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "전체"],
                ...CHANGE_REQUEST_STATUSES.map((status) => [status, status] as const),
              ] as const
            ).map(([value, label]) => {
              const selected = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors ${
                    selected
                      ? "bg-ink text-white"
                      : "bg-surface text-ink-subtle hover:bg-edge hover:text-ink"
                  }`}
                >
                  {label} {counts[value]}
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="rounded-xl border border-danger-edge bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-10 text-center text-[13px] text-ink-subtle">
              불러오는 중…
            </p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-subtle">
              {requests.length === 0
                ? "남겨진 수정 요청이 없습니다."
                : "이 상태의 요청이 없습니다."}
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((request) => {
                const saving = savingId === request.id;
                const resolvedLabel = request.resolvedOn
                  ? formatDotDate(request.resolvedOn)
                  : "";
                return (
                  <article
                    key={request.id}
                    className={`${uiCard} bg-surface px-5 py-4`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <select
                          aria-label={`${request.authorName} 요청 상태`}
                          value={request.status}
                          disabled={saving}
                          onChange={(event) => {
                            const status = event.target.value as ChangeRequestStatus;
                            const resolvedOn =
                              status === "반영됨"
                                ? (request.resolvedOn ?? todayIsoDate())
                                : null;
                            void updateRequest(request, status, resolvedOn);
                          }}
                          className={`h-8 rounded-xl border border-edge px-2.5 text-[12px] font-bold outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60 ${STATUS_CLASS[request.status]}`}
                        >
                          {CHANGE_REQUEST_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {request.status === "반영됨" ? (
                          <input
                            type="date"
                            aria-label="반영된 날짜"
                            value={request.resolvedOn ?? todayIsoDate()}
                            disabled={saving}
                            onChange={(event) => {
                              if (!event.target.value) return;
                              void updateRequest(
                                request,
                                "반영됨",
                                event.target.value,
                              );
                            }}
                            className="h-8 rounded-xl border border-edge bg-surface px-2.5 text-[12px] font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
                          />
                        ) : null}
                        <h2 className="truncate text-[15px] font-bold text-ink">
                          {request.authorName}
                        </h2>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            request.category === "오류"
                              ? "bg-danger-soft text-danger"
                              : "bg-selected text-accent"
                          }`}
                        >
                          {request.category}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <time className="text-[12px] text-ink-subtle">
                          {formatCreatedAt(request.createdAt)}
                        </time>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(request)}
                          disabled={saving}
                          className="rounded-xl px-2.5 py-1 text-[12px] font-bold text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-[14px] leading-6 whitespace-pre-wrap text-ink-secondary">
                      {request.body}
                    </p>
                    {request.status === "반영됨" &&
                    changelogDates.has(resolvedLabel) ? (
                      <p className="mt-2 text-[12px] font-medium text-accent">
                        {resolvedLabel} 적용 내용에 같은 날짜가 있습니다.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-request-title"
            className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          >
            <h3
              id="delete-request-title"
              className="text-[17px] font-bold text-ink"
            >
              수정 요청을 삭제할까요?
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-ink-subtle">
              <span className="font-semibold text-ink">{deleteTarget.authorName}</span>의 요청을 삭제합니다. 삭제한 내용은 복구할 수 없습니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className={`rounded-xl px-4 py-3 text-[14px] font-bold disabled:opacity-60 ${uiBtnDanger}`}
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className={`rounded-xl px-4 py-3 text-[14px] font-bold disabled:opacity-60 ${uiBtnGhost}`}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
