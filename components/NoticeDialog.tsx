"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SelectDropdown } from "@/components/SelectDropdown";
import { api } from "@/lib/api/client";
import {
  latestChangelogDate,
  toChangelogEntries,
  type ChangelogItem,
} from "@/lib/changelog";
import { writeSeenChangelogDate } from "@/lib/changelog-seen";
import {
  CHANGE_REQUEST_CATEGORIES,
  formatDotDate,
} from "@/lib/change-requests";
import type {
  ChangeRequest,
  ChangeRequestCategory,
  ChangeRequestStatus,
  Person,
} from "@/lib/types";
import { uiCard, uiPanelHeader } from "@/lib/ui-tokens";

type NoticeTab = "updates" | "requests";

type NoticeDialogProps = {
  open: boolean;
  people: Person[];
  onClose: () => void;
  onChangelogSeen: () => void;
};

const STATUS_CLASS: Record<ChangeRequestStatus, string> = {
  접수: "bg-surface-muted text-ink-secondary",
  "진행 중": "bg-selected-hover text-accent",
  반영됨: "bg-success-soft text-success",
  보류: "bg-warning-soft text-warning-ink",
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDotDate(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

export function NoticeDialog({
  open,
  people,
  onClose,
  onChangelogSeen,
}: NoticeDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [tab, setTab] = useState<NoticeTab>("updates");
  const [highlightDate, setHighlightDate] = useState("");
  const [changelog, setChangelog] = useState<ChangelogItem[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState("");
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [personId, setPersonId] = useState("");
  const [requestScope, setRequestScope] = useState<"all" | "person">("all");
  const [category, setCategory] = useState<ChangeRequestCategory | "">("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);

    if (open) {
      setMounted(true);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }

    setShown(false);
    timerRef.current = window.setTimeout(() => {
      setMounted(false);
      timerRef.current = null;
    }, 200);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector("[role='listbox']")) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || tab !== "updates" || changelogLoading) return;
    const latest = latestChangelogDate(changelog);
    if (!latest) return;
    writeSeenChangelogDate(latest);
    onChangelogSeen();
  }, [open, tab, changelog, changelogLoading, onChangelogSeen]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setChangelogLoading(true);
    setChangelogError("");
    api
      .getChangelog()
      .then((rows) => {
        if (!cancelled) setChangelog(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setChangelogError(
            error instanceof Error
              ? error.message
              : "적용 내용을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setChangelogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRequestsLoading(true);
    setRequestsError("");
    api
      .getChangeRequests()
      .then((rows) => {
        if (!cancelled) setRequests(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRequestsError(
            error instanceof Error
              ? error.message
              : "수정 요청을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRequestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!personId) setRequestScope("all");
  }, [personId]);

  const activePeople = people.filter(
    (person) => person.employmentStatus === "재직",
  );
  const visibleRequests =
    requestScope === "person"
      ? requests.filter((request) => request.personId === personId)
      : requests;
  const changelogEntries = useMemo(
    () => toChangelogEntries(changelog),
    [changelog],
  );
  const changelogDates = new Set(changelogEntries.map((entry) => entry.date));

  const showChangelog = (date: string) => {
    setTab("updates");
    setHighlightDate(date);
    requestAnimationFrame(() => {
      document.getElementById(`changelog-${date}`)?.scrollIntoView({
        block: "nearest",
      });
    });
  };

  const handleSubmit = async () => {
    const text = body.trim();
    if (!personId) {
      setFormError("이름을 선택해 주세요.");
      return;
    }
    if (!category) {
      setFormError("구분을 선택해 주세요.");
      return;
    }
    if (!text) {
      setFormError("내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setRequestsError("");
    try {
      const created = await api.createChangeRequest({
        personId,
        category,
        body: text,
      });
      setRequests((current) => [created, ...current]);
      setBody("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "요청을 남기지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-dialog-title"
        className={`flex h-[min(720px,88vh)] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl bg-surface-subtle shadow-[0_16px_40px_rgba(0,0,0,0.16)] transition-all duration-200 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <header
          className={`flex h-14 shrink-0 items-center justify-between gap-3 ${uiPanelHeader} bg-surface px-5`}
        >
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h2
              id="notice-dialog-title"
              className="shrink-0 text-[16px] font-bold text-ink"
            >
              작업 내용&요청
            </h2>
            <p className="truncate text-[12px] text-ink-subtle">
              적용된 내용과 수정 요청을 확인할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-surface-muted px-3 py-1.5 text-[13px] font-bold text-ink-subtle transition-colors hover:bg-edge"
          >
            닫기
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-5">
          <div className="mb-4 flex shrink-0 rounded-xl bg-surface-muted p-1">
            {(
              [
                { value: "updates", label: "적용 내용" },
                { value: "requests", label: "수정 요청" },
              ] as const
            ).map((option) => {
              const selected = tab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTab(option.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
                    selected
                      ? "bg-surface text-ink shadow-[0_1px_2px_rgba(25,31,40,0.08)]"
                      : "text-ink-subtle hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {tab === "updates" ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {changelogError ? (
                <p className="rounded-xl border border-danger-edge bg-danger-soft px-3 py-2 text-[12px] font-medium text-danger">
                  {changelogError}
                </p>
              ) : null}
              {changelogLoading ? (
                <p className="px-1 py-8 text-center text-[13px] text-ink-subtle">
                  불러오는 중…
                </p>
              ) : changelogEntries.length === 0 && !changelogError ? (
                <p className="px-1 py-8 text-center text-[13px] text-ink-subtle">
                  아직 적용된 내용이 없습니다.
                </p>
              ) : (
                changelogEntries.map((entry, index) => (
                  <article
                    key={entry.id}
                    id={
                      changelogEntries.findIndex((item) => item.date === entry.date) ===
                      index
                        ? `changelog-${entry.date}`
                        : undefined
                    }
                    className={`${uiCard} px-4 py-3.5 ${
                      highlightDate === entry.date
                        ? "bg-selected ring-2 ring-accent"
                        : "bg-surface"
                    }`}
                  >
                    <h3 className="text-[14px] font-bold text-ink">
                      {entry.date}
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {entry.lines.map((line, lineIndex) => (
                        <li
                          key={`${entry.id}-${lineIndex}`}
                          className="flex gap-2 text-[13px] leading-5 text-ink-secondary"
                        >
                          <span aria-hidden="true" className="text-ink-subtle">
                            ·
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))
              )}
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4">
              <form
                className={`${uiCard} flex h-full min-h-0 flex-col bg-surface px-4 py-4`}
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <SelectDropdown
                  label="이름"
                  value={personId}
                  placeholder="이름을 선택해 주세요"
                  options={activePeople.map((person) => ({
                    value: person.id,
                    label: person.department
                      ? `${person.name} · ${person.department}`
                      : person.name,
                  }))}
                  onChange={setPersonId}
                />
                <div className="mt-3">
                  <p className="mb-1.5 text-[13px] font-semibold text-ink-subtle">
                    구분
                  </p>
                  <div className="flex gap-2">
                    {CHANGE_REQUEST_CATEGORIES.map((option) => {
                      const selected = category === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setCategory(option)}
                          className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-bold transition-colors ${
                            selected
                              ? option === "오류"
                                ? "border-danger-edge bg-danger-soft text-danger"
                                : "border-edge-selected bg-selected text-accent"
                              : "border-edge bg-surface text-ink-subtle hover:bg-surface-muted hover:text-ink"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="mt-3 flex min-h-0 flex-1 flex-col">
                  <span className="mb-1.5 block shrink-0 text-[13px] font-semibold text-ink-subtle">
                    내용
                  </span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={1000}
                    placeholder="고쳐야 할 내용이나 바라는 점을 적어 주세요"
                    className="min-h-0 w-full flex-1 resize-none rounded-xl border border-edge bg-surface-subtle px-3.5 py-2.5 text-[14px] leading-6 text-ink outline-none transition placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                  />
                </label>
                {activePeople.length === 0 ? (
                  <p className="mt-2 text-[12px] font-medium text-ink-subtle">
                    팀/인원 관리에서 재직 중인 사람을 먼저 등록해 주세요.
                  </p>
                ) : null}
                {formError ? (
                  <p className="mt-2 text-[12px] font-medium text-danger">
                    {formError}
                  </p>
                ) : null}
                <div className="mt-3 flex shrink-0 justify-end">
                  <button
                    type="submit"
                    disabled={submitting || activePeople.length === 0}
                    className="rounded-xl bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-edge-drag"
                  >
                    {submitting ? "남기는 중…" : "요청 남기기"}
                  </button>
                </div>
              </form>

              <div className="flex min-h-0 flex-col">
              <div className="mb-3 flex shrink-0 rounded-xl bg-surface-muted p-1">
                {(
                  [
                    { value: "all", label: "전체" },
                    { value: "person", label: "내 요청" },
                  ] as const
                ).map((option) => {
                  const selected = requestScope === option.value;
                  const disabled = option.value === "person" && !personId;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      disabled={disabled}
                      title={
                        disabled
                          ? "이름을 선택하면 내가 남긴 요청만 볼 수 있습니다."
                          : undefined
                      }
                      onClick={() => setRequestScope(option.value)}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:text-ink-subtle/40 ${
                        selected
                          ? "bg-surface text-ink shadow-[0_1px_2px_rgba(25,31,40,0.08)]"
                          : "text-ink-subtle hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {requestsError ? (
                <p className="mb-3 shrink-0 rounded-xl border border-danger-edge bg-danger-soft px-3 py-2 text-[12px] font-medium text-danger">
                  {requestsError}
                </p>
              ) : null}

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {requestsLoading ? (
                  <p className="px-1 py-6 text-center text-[13px] text-ink-subtle">
                    불러오는 중…
                  </p>
                ) : visibleRequests.length === 0 && !requestsError ? (
                  <p className="px-1 py-6 text-center text-[13px] text-ink-subtle">
                    {requestScope === "person"
                      ? "내가 남긴 요청이 없습니다."
                      : "남겨진 수정 요청이 없습니다."}
                  </p>
                ) : (
                  visibleRequests.map((request) => {
                    const resolvedLabel = request.resolvedOn
                      ? formatDotDate(request.resolvedOn)
                      : "";
                    return (
                      <article
                        key={request.id}
                        className={`${uiCard} bg-surface px-4 py-3.5`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-[14px] font-bold text-ink">
                              {request.authorName}
                            </h3>
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
                          <time className="shrink-0 text-[12px] text-ink-subtle">
                            {formatCreatedAt(request.createdAt)}
                          </time>
                        </div>
                        <p className="mt-2 text-[13px] leading-5 whitespace-pre-wrap text-ink-secondary">
                          {request.body}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-bold ${STATUS_CLASS[request.status]}`}
                          >
                            {request.status}
                            {request.status === "반영됨" && resolvedLabel
                              ? ` · ${resolvedLabel}`
                              : ""}
                          </span>
                          {request.status === "반영됨" &&
                          changelogDates.has(resolvedLabel) ? (
                            <button
                              type="button"
                              onClick={() => showChangelog(resolvedLabel)}
                              className="rounded-xl px-2 py-1 text-[12px] font-bold text-accent transition-colors hover:bg-selected"
                            >
                              적용 내용 보기
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
