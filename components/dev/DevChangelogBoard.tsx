"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { formatDotDate, todayIsoDate } from "@/lib/change-requests";
import { toChangelogEntries } from "@/lib/changelog";
import type { ChangelogItem } from "@/lib/changelog";
import {
  uiBtnDanger,
  uiBtnGhost,
  uiBtnPrimary,
  uiCard,
} from "@/lib/ui-tokens";
import { useDialogKeyboard } from "@/lib/use-dialog-keyboard";

export function DevChangelogBoard() {
  const [items, setItems] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  const [draftDate, setDraftDate] = useState(todayIsoDate);
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBody, setEditBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChangelogItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const entries = useMemo(() => toChangelogEntries(items), [items]);

  useEffect(() => {
    let cancelled = false;
    api
      .getChangelog()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "적용 내용을 불러오지 못했습니다.",
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

  const resetComposer = () => {
    setComposing(false);
    setDraftDate(todayIsoDate());
    setDraftBody("");
  };

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      const created = await api.createChangelogItem({
        date: draftDate,
        body: draftBody,
      });
      setItems((current) => [...current, created]);
      resetComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: ChangelogItem) => {
    setEditingId(item.id);
    setEditDate(item.date);
    setEditBody(item.body);
    setComposing(false);
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateChangelogItem(editingId, {
        date: editDate,
        body: editBody,
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteChangelogItem(deleteTarget.id);
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) setEditingId("");
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
        {composing ? (
          <form
            className={`${uiCard} flex flex-col gap-3 bg-surface px-5 py-4`}
            onSubmit={(event) => {
              event.preventDefault();
              void handleAdd();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-subtle">
                날짜
              </span>
              <input
                type="date"
                aria-label="적용 날짜"
                value={draftDate}
                onChange={(event) => setDraftDate(event.target.value)}
                className="h-10 rounded-xl border border-edge bg-surface px-3 text-[13px] font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-subtle">
                내용
              </span>
              <textarea
                aria-label="적용 내용"
                value={draftBody}
                onChange={(event) => setDraftBody(event.target.value)}
                rows={8}
                placeholder="적용된 내용을 적어 주세요. 한 줄이 항목 하나가 됩니다."
                className="w-full resize-y rounded-xl border border-edge bg-surface px-3 py-2.5 text-[14px] leading-6 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetComposer}
                disabled={saving}
                className={`rounded-xl px-3 py-2 text-[13px] font-bold disabled:opacity-60 ${uiBtnGhost}`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving || !draftBody.trim()}
                className={`rounded-xl px-4 py-2 text-[13px] font-bold disabled:opacity-60 ${uiBtnPrimary}`}
              >
                등록
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingId("");
                setComposing(true);
              }}
              className={`rounded-xl px-4 py-2 text-[13px] font-bold ${uiBtnPrimary}`}
            >
              새 글
            </button>
          </div>
        )}

        {error ? (
          <p className="rounded-xl border border-danger-edge bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-10 text-center text-[13px] text-ink-subtle">
            불러오는 중…
          </p>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-subtle">
            아직 적용된 내용이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const item = items.find((row) => row.id === entry.id);
              if (!item) return null;
              const editing = editingId === item.id;
              return (
                <article key={item.id} className={`${uiCard} bg-surface px-5 py-4`}>
                  {editing ? (
                    <div className="flex flex-col gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] font-semibold text-ink-subtle">
                          날짜
                        </span>
                        <input
                          type="date"
                          aria-label="수정할 날짜"
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                          className="h-10 rounded-xl border border-edge bg-surface px-3 text-[13px] font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[12px] font-semibold text-ink-subtle">
                          내용
                        </span>
                        <textarea
                          aria-label="수정할 내용"
                          value={editBody}
                          onChange={(event) => setEditBody(event.target.value)}
                          rows={8}
                          className="w-full resize-y rounded-xl border border-edge bg-surface px-3 py-2.5 text-[14px] leading-6 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId("")}
                          disabled={saving}
                          className={`rounded-xl px-3 py-2 text-[13px] font-bold disabled:opacity-60 ${uiBtnGhost}`}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit()}
                          disabled={saving || !editBody.trim()}
                          className={`rounded-xl px-4 py-2 text-[13px] font-bold disabled:opacity-60 ${uiBtnPrimary}`}
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[15px] font-bold text-ink">
                          {formatDotDate(item.date)}
                        </h2>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded-xl px-2.5 py-1 text-[12px] font-bold text-ink-subtle transition-colors hover:bg-edge hover:text-ink"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-xl px-2.5 py-1 text-[12px] font-bold text-danger transition-colors hover:bg-danger-soft"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-[14px] leading-6 whitespace-pre-wrap text-ink-secondary">
                        {item.body}
                      </p>
                    </>
                  )}
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
            aria-labelledby="delete-changelog-title"
            className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
          >
            <h3
              id="delete-changelog-title"
              className="text-[17px] font-bold text-ink"
            >
              이 글을 삭제할까요?
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-ink-subtle">
              {formatDotDate(deleteTarget.date)} 글 전체가 작업 내용&요청에서 더
              이상 보이지 않습니다. 삭제한 내용은 복구할 수 없습니다.
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
