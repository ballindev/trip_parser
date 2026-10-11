import { jsonError, jsonOk } from "@/lib/api/http";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{ id: string; participantId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { participantId } = await params;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("trip_participants")
      .delete()
      .eq("id", participantId);

    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "삭제 실패", 500);
  }
}
