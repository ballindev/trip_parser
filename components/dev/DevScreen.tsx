"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DevChangelogBoard } from "@/components/dev/DevChangelogBoard";
import { DevRequestBoard } from "@/components/dev/DevRequestBoard";
import { uiCanvas, uiPanelHeader } from "@/lib/ui-tokens";

type DevTab = "requests" | "updates";

export function DevScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: DevTab =
    searchParams.get("tab") === "updates" ? "updates" : "requests";
  const [tab, setTab] = useState<DevTab>(initialTab);
  const [loggingOut, setLoggingOut] = useState(false);

  const selectTab = (next: DevTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "updates") params.set("tab", "updates");
    else params.delete("tab");
    const query = params.toString();
    router.replace(query ? `/dev/requests?${query}` : "/dev/requests");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/dev/session", { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className={`flex h-screen flex-col ${uiCanvas}`}>
      <header
        className={`flex h-14 shrink-0 items-center justify-between gap-3 ${uiPanelHeader} bg-surface px-6`}
      >
        <h1 className="truncate text-[16px] font-bold text-ink">개발자 화면</h1>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/"
            className="rounded-xl bg-surface-muted px-3 py-1.5 text-[13px] font-bold text-ink-subtle transition-colors hover:bg-edge hover:text-ink"
          >
            출장 화면
          </a>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="rounded-xl bg-surface-muted px-3 py-1.5 text-[13px] font-bold text-ink-subtle transition-colors hover:bg-edge hover:text-ink disabled:opacity-60"
          >
            나가기
          </button>
        </div>
      </header>

      <div className="shrink-0 px-6 pt-4">
        <div className="mx-auto flex w-full max-w-[840px] rounded-xl bg-surface-muted p-1">
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
                onClick={() => selectTab(option.value)}
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
      </div>

      {tab === "requests" ? <DevRequestBoard /> : <DevChangelogBoard />}
    </div>
  );
}
