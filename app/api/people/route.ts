import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { mapPerson, type DbPerson } from "@/lib/mappers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("people")
      .select("*")
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
    const { data, error } = await supabase
      .from("people")
      .insert({
        name: body.name.trim(),
        rank: body.rank?.trim() ?? "",
        department: body.department?.trim() ?? "",
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    if (body.teamId) {
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: body.teamId,
        person_id: data.id,
      });
      if (memberError) return jsonError(memberError.message, 500);
    }

    return jsonOk(mapPerson(data as DbPerson), { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "추가 실패", 500);
  }
}
