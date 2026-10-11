import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{ name?: string; memberIds?: string[] }>(
      request,
    );
    const supabase = getSupabaseServerClient();

    if (body.name !== undefined) {
      const { error } = await supabase
        .from("teams")
        .update({ name: body.name.trim() })
        .eq("id", id);
      if (error) return jsonError(error.message, 500);
    }

    if (body.memberIds !== undefined) {
      await supabase.from("team_members").delete().eq("team_id", id);
      if (body.memberIds.length > 0) {
        const { error } = await supabase.from("team_members").insert(
          body.memberIds.map((personId) => ({
            team_id: id,
            person_id: personId,
          })),
        );
        if (error) return jsonError(error.message, 500);
      }

      if (body.name !== undefined) {
        // Keep people.department in sync with team name for members
        const { error } = await supabase
          .from("people")
          .update({ department: body.name.trim() })
          .in("id", body.memberIds);
        if (error) return jsonError(error.message, 500);
      }
    }

    const [teamRes, membersRes] = await Promise.all([
      supabase.from("teams").select("*").eq("id", id).single(),
      supabase.from("team_members").select("person_id").eq("team_id", id),
    ]);

    if (teamRes.error) return jsonError(teamRes.error.message, 500);
    if (membersRes.error) return jsonError(membersRes.error.message, 500);

    return jsonOk({
      id: teamRes.data.id as string,
      name: teamRes.data.name as string,
      memberIds: (membersRes.data ?? []).map(
        (row) => row.person_id as string,
      ),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "수정 실패", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "삭제 실패", 500);
  }
}
