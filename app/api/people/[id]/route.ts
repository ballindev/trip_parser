import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { mapPerson, type DbPerson } from "@/lib/mappers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{
      name?: string;
      rank?: string;
      department?: string;
      teamId?: string;
      employmentStatus?: "재직" | "퇴사";
    }>(request);

    const supabase = getSupabaseServerClient();

    let employmentPatch: {
      employment_status?: "재직" | "퇴사";
      resigned_at?: string | null;
    } = {};
    if (body.employmentStatus === "퇴사" || body.employmentStatus === "재직") {
      const { data: current } = await supabase
        .from("people")
        .select("employment_status, resigned_at")
        .eq("id", id)
        .single();

      if (body.employmentStatus === "퇴사") {
        employmentPatch = {
          employment_status: "퇴사",
          resigned_at:
            current?.employment_status === "퇴사" && current?.resigned_at
              ? current.resigned_at
              : new Date().toISOString(),
        };
      } else {
        employmentPatch = {
          employment_status: "재직",
          resigned_at: null,
        };
      }
    }

    const nextName =
      body.name !== undefined ? body.name.trim() : undefined;
    const nextDepartment =
      body.department !== undefined ? body.department.trim() : undefined;

    const { data, error } = await supabase
      .from("people")
      .update({
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(body.rank !== undefined ? { rank: body.rank.trim() } : {}),
        ...(nextDepartment !== undefined
          ? { department: nextDepartment }
          : {}),
        ...employmentPatch,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    // 출장 참여자에 복사된 이름/부서도 함께 갱신합니다.
    if (nextName !== undefined || nextDepartment !== undefined) {
      const participantPatch: { name?: string; department?: string } = {};
      if (nextName !== undefined) participantPatch.name = nextName;
      if (nextDepartment !== undefined) {
        participantPatch.department = nextDepartment;
      }

      const { error: participantError } = await supabase
        .from("trip_participants")
        .update(participantPatch)
        .eq("person_id", id);

      if (participantError) return jsonError(participantError.message, 500);
    }

    if (body.teamId !== undefined) {
      await supabase.from("team_members").delete().eq("person_id", id);
      if (body.teamId) {
        const { error: memberError } = await supabase
          .from("team_members")
          .insert({ team_id: body.teamId, person_id: id });
        if (memberError) return jsonError(memberError.message, 500);
      }
    }

    return jsonOk(mapPerson(data as DbPerson));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "수정 실패", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "삭제 실패", 500);
  }
}
