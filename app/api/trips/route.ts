import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { fetchAllTrips } from "@/lib/api/trips";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const trips = await fetchAllTrips();
    return jsonOk(trips);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "조회 실패", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      name: string;
      startDate: string;
      endDate: string;
      summary?: string;
    }>(request);

    if (!body.name?.trim()) return jsonError("출장명을 입력해 주세요.");
    if (!body.startDate || !body.endDate) {
      return jsonError("시작일·종료일을 입력해 주세요.");
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("trips")
      .insert({
        name: body.name.trim(),
        start_date: body.startDate,
        end_date: body.endDate,
        summary: body.summary?.trim() ?? "",
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    return jsonOk(
      {
        id: data.id as string,
        name: data.name as string,
        startDate: data.start_date as string,
        endDate: data.end_date as string,
        summary: (data.summary as string) ?? "",
        participants: [],
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "추가 실패", 500);
  }
}
