import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import {
  changeRequestDbError,
  isChangeRequestCategory,
  mapChangeRequest,
  type DbChangeRequest,
} from "@/lib/change-requests";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("change_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return jsonError(changeRequestDbError(error.message), 500);
    return jsonOk((data as DbChangeRequest[]).map(mapChangeRequest));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "조회 실패", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      personId?: string;
      category?: string;
      body?: string;
    }>(request);

    const text = body.body?.trim() ?? "";
    if (!body.personId) return jsonError("이름을 선택해 주세요.");
    if (!body.category || !isChangeRequestCategory(body.category)) {
      return jsonError("구분을 선택해 주세요.");
    }
    if (!text) return jsonError("내용을 입력해 주세요.");
    if (text.length > 1000) return jsonError("내용은 1000자까지 입력할 수 있습니다.");

    const supabase = getSupabaseServerClient();
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id, name")
      .eq("id", body.personId)
      .maybeSingle();

    if (personError) return jsonError(personError.message, 500);
    if (!person?.name) return jsonError("이름을 선택해 주세요.");

    const { data, error } = await supabase
      .from("change_requests")
      .insert({
        person_id: person.id,
        author_name: person.name,
        category: body.category,
        body: text,
        status: "접수",
      })
      .select("*")
      .single();

    if (error) return jsonError(changeRequestDbError(error.message), 500);
    return jsonOk(mapChangeRequest(data as DbChangeRequest), { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "저장 실패", 500);
  }
}
