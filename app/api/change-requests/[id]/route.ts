import { cookies } from "next/headers";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import {
  changeRequestDbError,
  mapChangeRequest,
  parseStatusPatch,
  type DbChangeRequest,
} from "@/lib/change-requests";
import { DEV_SESSION_COOKIE, isDeveloperSession } from "@/lib/dev-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    if (!isDeveloperSession(cookieStore.get(DEV_SESSION_COOKIE)?.value)) {
      return jsonError("개발자만 상태를 바꿀 수 있습니다.", 401);
    }

    const { id } = await params;
    const body = await readJson<{
      status?: string;
      resolvedOn?: string | null;
    }>(request);
    const parsed = parseStatusPatch(body);
    if ("error" in parsed) return jsonError(parsed.error);

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("change_requests")
      .update({
        status: parsed.status,
        resolved_on: parsed.resolvedOn,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return jsonError(changeRequestDbError(error.message), 500);
    if (!data) return jsonError("수정 요청을 찾지 못했습니다.", 404);
    return jsonOk(mapChangeRequest(data as DbChangeRequest));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "저장 실패", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    if (!isDeveloperSession(cookieStore.get(DEV_SESSION_COOKIE)?.value)) {
      return jsonError("개발자만 삭제할 수 있습니다.", 401);
    }

    const { id } = await params;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("change_requests")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return jsonError(changeRequestDbError(error.message), 500);
    if (!data) return jsonError("수정 요청을 찾지 못했습니다.", 404);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "삭제 실패", 500);
  }
}
