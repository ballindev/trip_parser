import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { DevLoginForm } from "@/components/dev/DevLoginForm";
import { DEV_SESSION_COOKIE, isDeveloperSession } from "@/lib/dev-session";

export function DevGate({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen items-center justify-center bg-surface-subtle">
          <p className="text-[14px] font-semibold text-ink-subtle">확인하는 중…</p>
        </main>
      }
    >
      <DevSession>{children}</DevSession>
    </Suspense>
  );
}

async function DevSession({ children }: { children: ReactNode }) {
  await connection();
  const cookieStore = await cookies();
  const allowed = isDeveloperSession(cookieStore.get(DEV_SESSION_COOKIE)?.value);
  if (!allowed) return <DevLoginForm />;
  return children;
}
