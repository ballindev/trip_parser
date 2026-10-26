import { cookies } from "next/headers";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { parseChangelogInput } from "@/lib/changelog";
import {
  deleteChangelogItem,
  updateChangelogItem,
} from "@/lib/changelog-store";
import { DEV_SESSION_COOKIE, isDeveloperSession } from "@/lib/dev-session";

type Params = { params: Promise<{ id: string }> };

async function requireDeveloper() {
  const cookieStore = await cookies();
  return isDeveloperSession(cookieStore.get(DEV_SESSION_COOKIE)?.value);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireDeveloper())) {
      return jsonError("개발자만 내용을 수정할 수 있습니다.", 401);
    }

    const { id } = await params;
    const body = await readJson<{ date?: string; body?: string }>(request);
    const parsed = parseChangelogInput(body);
    if ("error" in parsed) return jsonError(parsed.error);

    const updated = await updateChangelogItem(id, parsed);
    if (!updated) return jsonError("적용 내용을 찾지 못했습니다.", 404);
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "저장 실패", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await requireDeveloper())) {
      return jsonError("개발자만 내용을 삭제할 수 있습니다.", 401);
    }

    const { id } = await params;
    const deleted = await deleteChangelogItem(id);
    if (!deleted) return jsonError("적용 내용을 찾지 못했습니다.", 404);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "삭제 실패", 500);
  }
}
