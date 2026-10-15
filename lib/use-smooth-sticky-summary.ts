"use client";

import { useEffect, useRef, type RefObject } from "react";

type UseSmoothStickySummaryOptions = {
  enabled: boolean;
  /** 출장명 헤더 높이만큼 시작 오프셋 (px) */
  baseOffset?: number;
};

/**
 * sticky 대신 스크롤량을 lerp로 따라가 요약 패널이 부드럽게 고정됩니다.
 */
export function useSmoothStickySummary(
  scrollRef: RefObject<HTMLElement | null>,
  summaryRef: RefObject<HTMLElement | null>,
  { enabled, baseOffset = 0 }: UseSmoothStickySummaryOptions,
) {
  const offsetY = useRef(0);
  const targetY = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollRef.current;
    const summaryEl = summaryRef.current;
    if (!scrollEl || !summaryEl) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lerpFactor = reduceMotion ? 1 : 0.14;

    const measureMax = () => {
      const contentEl = scrollEl.firstElementChild as HTMLElement | null;
      const contentHeight = contentEl?.offsetHeight ?? scrollEl.scrollHeight;
      const summaryHeight = summaryEl.offsetHeight;
      return Math.max(0, contentHeight - baseOffset - summaryHeight - 16);
    };

    const updateTarget = () => {
      targetY.current = Math.min(
        Math.max(0, scrollEl.scrollTop),
        measureMax(),
      );
    };

    const tick = () => {
      const prev = offsetY.current;
      const target = targetY.current;
      const next = prev + (target - prev) * lerpFactor;
      offsetY.current = Math.abs(target - next) < 0.4 ? target : next;
      summaryEl.style.transform = `translate3d(0, ${offsetY.current}px, 0)`;
      if (offsetY.current !== target) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const onScroll = () => {
      updateTarget();
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    updateTarget();
    offsetY.current = targetY.current;
    summaryEl.style.transform = `translate3d(0, ${offsetY.current}px, 0)`;

    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const resizeObserver = new ResizeObserver(onScroll);
    resizeObserver.observe(scrollEl);
    if (scrollEl.firstElementChild) {
      resizeObserver.observe(scrollEl.firstElementChild);
    }
    resizeObserver.observe(summaryEl);

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver.disconnect();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      summaryEl.style.transform = "";
    };
  }, [enabled, baseOffset, scrollRef, summaryRef]);
}
