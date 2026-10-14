import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { mapPerson, type DbPerson } from "@/lib/mappers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return jsonError(error.message, 500);
    return jsonOk((data as DbPerson[]).map(mapPerson));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "조회 실패", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      name: string;
      rank: string;
      department: string;
      teamId?: string;
    }>(request);

    if (!body.name?.trim()) return jsonError("이름을 입력해 주세요.");

    const supabase = getSupabaseServerClient();

    const { data: maxRow } = await supabase
      .from("people")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder =
      typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("people")
      .insert({
        name: body.name.trim(),
        rank: body.rank?.trim() ?? "",
        department: body.department?.trim() ?? "",
        sort_order: nextSortOrder,
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    if (body.teamId) {
      const { data: maxMember } = await supabase
        .from("team_members")
        .select("sort_order")
        .eq("team_id", body.teamId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextMemberOrder =
        typeof maxMember?.sort_order === "number"
          ? maxMember.sort_order + 1
          : 0;

      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: body.teamId,
        person_id: data.id,
        sort_order: nextMemberOrder,
      });
      if (memberError) return jsonError(memberError.message, 500);
    }

    return jsonOk(mapPerson(data as DbPerson), { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "추가 실패", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ orderedIds?: string[] }>(request);
    const orderedIds = body.orderedIds ?? [];

    if (orderedIds.length === 0) {
      return jsonError("정렬할 인원 목록이 없습니다.");
    }

    const supabase = getSupabaseServerClient();
    const { data: existing, error: existingError } = await supabase
      .from("people")
      .select("id");

    if (existingError) return jsonError(existingError.message, 500);

    const existingIds = new Set(
      (existing ?? []).map((row) => row.id as string),
    );
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      return jsonError("인원 목록이 현재 데이터와 일치하지 않습니다.");
    }

    const updates = await Promise.all(
      orderedIds.map((personId, index) =>
        supabase
          .from("people")
          .update({ sort_order: index })
          .eq("id", personId),
      ),
    );

    const failed = updates.find((result) => result.error);
    if (failed?.error) return jsonError(failed.error.message, 500);

    return jsonOk({ ok: true, orderedIds });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "순서 변경 실패",
      500,
    );
  }
}
