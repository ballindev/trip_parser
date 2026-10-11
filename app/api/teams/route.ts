import { jsonError, jsonOk, readJson } from "@/lib/api/http";
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
      supabase.from("teams").select("*").order("name", { ascending: true }),
      supabase.from("team_members").select("*"),
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
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: body.name.trim() })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    const memberIds = body.memberIds ?? [];
    if (memberIds.length > 0) {
      const { error: memberError } = await supabase.from("team_members").insert(
        memberIds.map((personId) => ({
          team_id: data.id,
          person_id: personId,
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
