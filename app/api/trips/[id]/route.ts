import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{
      name?: string;
      startDate?: string;
      endDate?: string;
      summary?: string;
    }>(request);

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("trips")
      .update({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.startDate !== undefined ? { start_date: body.startDate } : {}),
        ...(body.endDate !== undefined ? { end_date: body.endDate } : {}),
        ...(body.summary !== undefined
          ? { summary: body.summary.trim() }
          : {}),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    return jsonOk({
      id: data.id as string,
      name: data.name as string,
      startDate: data.start_date as string,
      endDate: data.end_date as string,
      summary: (data.summary as string) ?? "",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "수정 실패", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "삭제 실패", 500);
  }
}
