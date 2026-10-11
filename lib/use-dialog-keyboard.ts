"use client";

import { useEffect, useRef } from "react";

type UseDialogKeyboardOptions = {
  onConfirm?: () => void;
  onCancel?: () => void;
  /** false면 리스너를 걸지 않음 */
  enabled?: boolean;
  /** true면 Enter로 확인하지 않음 */
  confirmDisabled?: boolean;
};

/**
 * 팝업에서 Enter → 확인, Esc → 취소.
 * 한글 IME 조합 중 Enter, textarea 입력 중 Enter는 무시합니다.
 */
export function useDialogKeyboard({
  onConfirm,
  onCancel,
  enabled = true,
  confirmDisabled = false,
}: UseDialogKeyboardOptions) {
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current?.();
        return;
      }

      if (event.key !== "Enter") return;
      if (confirmDisabled || !onConfirmRef.current) return;

      const target = event.target;
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      event.preventDefault();
      onConfirmRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, confirmDisabled]);
}
