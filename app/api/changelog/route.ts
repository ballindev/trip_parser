import { connection } from "next/server";
import { cookies } from "next/headers";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { parseChangelogInput } from "@/lib/changelog";
import { addChangelogItem, readChangelogItems } from "@/lib/changelog-store";
import { DEV_SESSION_COOKIE, isDeveloperSession } from "@/lib/dev-session";

export async function GET() {
  try {
    await connection();
    const items = await readChangelogItems();
    return jsonOk(items);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "조회 실패", 500);
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (!isDeveloperSession(cookieStore.get(DEV_SESSION_COOKIE)?.value)) {
      return jsonError("개발자만 내용을 추가할 수 있습니다.", 401);
    }

    const body = await readJson<{ date?: string; body?: string }>(request);
    const parsed = parseChangelogInput(body);
    if ("error" in parsed) return jsonError(parsed.error);

    const created = await addChangelogItem(parsed);
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "저장 실패", 500);
  }
}
