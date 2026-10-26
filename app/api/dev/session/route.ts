import { cookies } from "next/headers";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import {
  DEV_SESSION_COOKIE,
  DEV_SESSION_MAX_AGE,
  createSessionValue,
  developerPassword,
  passwordsMatch,
} from "@/lib/dev-session";

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function POST(request: Request) {
  try {
    const secret = developerPassword();
    if (!secret) {
      return jsonError(
        "개발자 비밀번호가 서버에 설정되지 않았습니다.",
        500,
      );
    }

    const body = await readJson<{ password?: string }>(request);
    if (!passwordsMatch(body.password ?? "", secret)) {
      return jsonError("비밀번호가 맞지 않습니다.", 401);
    }

    const cookieStore = await cookies();
    cookieStore.set(
      DEV_SESSION_COOKIE,
      createSessionValue(secret),
      sessionCookieOptions(DEV_SESSION_MAX_AGE),
    );
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "로그인에 실패했습니다.",
      500,
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, "", sessionCookieOptions(0));
  return jsonOk({ ok: true });
}
