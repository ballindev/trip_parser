"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function DevLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/dev/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error || "비밀번호가 맞지 않습니다.");
        setPending(false);
        return;
      }
      setPassword("");
      router.refresh();
    } catch {
      setError("로그인에 실패했습니다.");
      setPending(false);
    }
  };

  return (
    <main className="flex h-screen items-center justify-center bg-surface-subtle px-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-[380px] rounded-2xl border border-edge bg-surface px-6 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
      >
        <h1 className="text-[18px] font-bold text-ink">개발자 확인</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-ink-subtle">
          개발자 화면을 열려면 비밀번호가 필요합니다.
        </p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-subtle">
            비밀번호
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            className="h-11 w-full rounded-xl border border-edge bg-surface-subtle px-3.5 text-[14px] text-ink outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </label>
        {error ? (
          <p className="mt-2 text-[12px] font-medium text-danger">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !password}
          className="mt-4 h-11 w-full rounded-xl bg-accent text-[14px] font-bold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-edge-drag"
        >
          {pending ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </main>
  );
}
