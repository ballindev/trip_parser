import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { updateSortOrdersSequentially } from "@/lib/api/sort-order";
import {
  mapTeams,
  type DbTeam,
  type DbTeamMember,
} from "@/lib/mappers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const [teamsRes, membersRes] = await Promise.all([
      supabase.from("teams").select("*").order("sort_order", { ascending: true }),
      supabase
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (teamsRes.error) return jsonError(teamsRes.error.message, 500);
    if (membersRes.error) return jsonError(membersRes.error.message, 500);

    return jsonOk(
      mapTeams(
        (teamsRes.data ?? []) as DbTeam[],
        (membersRes.data ?? []) as DbTeamMember[],
      ),
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "조회 실패", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ name: string; memberIds?: string[] }>(
      request,
    );
    if (!body.name?.trim()) return jsonError("팀명을 입력해 주세요.");

    const supabase = getSupabaseServerClient();
    const { data: maxRow } = await supabase
      .from("teams")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder =
      typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("teams")
      .insert({ name: body.name.trim(), sort_order: nextSortOrder })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    const memberIds = body.memberIds ?? [];
    if (memberIds.length > 0) {
      const { error: memberError } = await supabase.from("team_members").insert(
        memberIds.map((personId, index) => ({
          team_id: data.id,
          person_id: personId,
          sort_order: index,
        })),
      );
      if (memberError) return jsonError(memberError.message, 500);
    }

    return jsonOk(
      {
        id: data.id as string,
        name: data.name as string,
        memberIds,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "추가 실패", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{ orderedIds?: string[] }>(request);
    const orderedIds = body.orderedIds ?? [];

    if (orderedIds.length === 0) {
      return jsonError("정렬할 팀 목록이 없습니다.");
    }

    const supabase = getSupabaseServerClient();
    const { data: existing, error: existingError } = await supabase
      .from("teams")
      .select("id");

    if (existingError) return jsonError(existingError.message, 500);

    const existingIds = new Set((existing ?? []).map((row) => row.id as string));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      return jsonError("팀 목록이 현재 데이터와 일치하지 않습니다.");
    }

    const { error: reorderError } = await updateSortOrdersSequentially(
      supabase,
      "teams",
      orderedIds,
    );
    if (reorderError) return jsonError(reorderError.message, 500);

    return jsonOk({ ok: true, orderedIds });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "순서 변경 실패",
      500,
    );
  }
}
